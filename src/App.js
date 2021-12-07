import React, { useEffect, useRef, useState } from 'react';
import {Howl} from 'howler';
import * as mobilenet from '@tensorflow-models/mobilenet';
import * as knnClassifier from '@tensorflow-models/knn-classifier';
import { initNotifications, notify } from '@mycv/f8-notification';
// eslint-disable-next-line no-unused-vars
import * as tf from '@tensorflow/tfjs';
import soundURL from "./assets/sound.mp3"
import './App.css';

var sound = new Howl({
  src: [soundURL],
});



const NOT_TOUCH_LABEL = 'not_touch';
const TOUCHED_LABEL = 'touched';
const TRAINING_TIME = 50;
const TOUCHED_CONFIDENT = 0.8;

function App() {
  const canPlaySound = useRef(true)
  const video = useRef();
  const classifier = useRef();
  const mobilenetModule = useRef();
  const [touched, setTouched] = useState(false)

  const init = async () => {
    console.log('init');
    await setupCamera();
    console.log('setup camera successss');

    classifier.current = knnClassifier.create();

    mobilenetModule.current = await mobilenet.load();
    console.log('set up done');
    console.log('Dont touch your face and press train 1');
    initNotifications({cooldown: 3000})
  };

  // turn on the camera
  const setupCamera = () => {
    return new Promise((resolve, reject) => {
      navigator.getUserMedia =
        navigator.getUserMedia ||
        navigator.webkitGetUserMedia ||
        navigator.mozGetUserMedia ||
        navigator.msGetUserMedia;

      if (navigator.getUserMedia) {
        navigator.getUserMedia(
          { video: true },
          (stream) => {
            video.current.srcObject = stream;
            video.current.addEventListener('loadeddata', resolve); //add loadeddata event listener to video element
          },
          (error) => reject(error)
        );
      } else {
        reject();
      }
    });
  };

  const train = async (label) => {
    console.log(`${label} training in progress`);
    for (let i = 0; i < TRAINING_TIME; i++) {
      console.log(`Progress ${parseInt(((i + 1) / TRAINING_TIME) * 100)}%`);

      await training(label);
    }
  };

  /**
   * Step 1: Train while you dont touch your face
   * Step 2: Train while you touch your face
   * Step 3: Take the current frame, compare with your data
   * => If matching with the Step 1 => Warning
   * @param {*} label
   *
   */

  const training = (label) => {
    return new Promise(async (resolve) => {
      const embedding = mobilenetModule.current.infer(
        //read doc
        video.current,
        true
      );
      classifier.current.addExample(embedding, label);
      await sleep(100); // to sleep after each capture screen
      resolve();
    });
  };

  const run = async () => {
    const embedding = mobilenetModule.current.infer(
      //read doc
      video.current,
      true
    );
    const result = await classifier.current.predictClass(embedding);

    // console.log('label: ', result.label);
    // console.log('Confident: ', result.confidences);

    if (
      result.label === TOUCHED_LABEL &&
      result.confidences[result.label] > TOUCHED_CONFIDENT
    ) {
      console.log('Touched');
      // only play sound 1 time
      if(canPlaySound.current) {
        canPlaySound.current = false
        sound.play();
      }
      
      notify('BO tay ra', {body: "you just touched your face"})
      setTouched(true)
    } else {
      console.log('Not Touched');
      setTouched(false)
    }

    // measure 5 times per second, endless loop
    await sleep(200);

    run();
  };

  const sleep = (ms) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
  };

  useEffect(() => {
    init();

    sound.on('end', function() {
      canPlaySound.current = true
    })
    
    return () => {};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={`main ${touched ? 'touched' : ''}`}>
      <video className='video' autoPlay ref={video} />
      <div className='control'>
        <button className='btn' onClick={() => train(NOT_TOUCH_LABEL)}>
          Train 1
        </button>
        <button className='btn' onClick={() => train(TOUCHED_LABEL)}>
          Train 1
        </button>
        <button className='btn' onClick={() => run()}>
          Run
        </button>
      </div>
    </div>
  );
}

export default App;
