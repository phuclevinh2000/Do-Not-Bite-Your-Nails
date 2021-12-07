import React, { useEffect, useRef, useState } from 'react';
import { Howl } from 'howler';
import * as mobilenet from '@tensorflow-models/mobilenet';
import * as knnClassifier from '@tensorflow-models/knn-classifier';
import Loader from 'react-loader-spinner';
// eslint-disable-next-line no-unused-vars
import * as tf from '@tensorflow/tfjs';
import {
  NOT_TOUCH_LABEL,
  TOUCHED_LABEL,
  TRAINING_TIME,
  TOUCHED_CONFIDENT,
} from './constants/constants';
import soundURL from './assets/sound.mp3';
import './App.css';

const sound = new Howl({
  src: [soundURL],
});

function App() {
  const canPlaySound = useRef(true);
  const video = useRef();
  const classifier = useRef();
  const mobilenetModule = useRef();
  const [touched, setTouched] = useState(false);
  const [trainingOneProgress, setTrainingOneProgress] =
    useState('Not Completed Yet');
  const [trainingTwoProgress, setTrainingTwoProgress] =
    useState('Not Completed Yet');
  const [loader, setLoader] = useState(false);
  const [runBtn, setRunBtn] = useState(true);

  const init = async () => {
    console.log('init');
    await setupCamera();
    console.log('setup camera successss');

    // set up for knnCLassifier
    classifier.current = knnClassifier.create();
    // set up for mobilenet
    mobilenetModule.current = await mobilenet.load();

    console.log('set up done');
    setLoader(true);
    console.log('Dont touch your face and press train 1');
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
    if (label === NOT_TOUCH_LABEL) setTrainingOneProgress('Completed');
    if (label === TOUCHED_LABEL) setTrainingTwoProgress('Completed');
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

  // running function
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
      if (canPlaySound.current) {
        canPlaySound.current = false;
        sound.play();
      }

      setTouched(true);
    } else {
      console.log('Not Touched');
      setTouched(false);
    }
    // measure 5 times per second, endless loop
    await sleep(200);
    run();
  };

  // Sleep function
  const sleep = (ms) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
  };

  useEffect(() => {
    init();

    sound.on('end', function () {
      canPlaySound.current = true;
    });

    return () => {};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={`main ${touched ? 'touched' : ''}`}>
      {touched ? (
        <h1 className='title'>Stop bite your nails</h1>
      ) : (
        <h1 className='title'>Dont bite your nails</h1>
      )}
      <video className='video' autoPlay ref={video} />
      {loader ? (
        <div>
          <div className='control'>
            <button className='btn' onClick={() => train(NOT_TOUCH_LABEL)}>
              Train 1: Dont bite your nails
            </button>
            <button className='btn' onClick={() => train(TOUCHED_LABEL)}>
              Train 2: Bite your nails
            </button>
            <button  className='btn' onClick={() => run()}>
              Run
            </button>
          </div>
          <div className='progress'>
            {trainingOneProgress === 'Completed' &&
            trainingTwoProgress === 'Completed' ? (
              <div style={{color: "green"}}>
                {/* {setRunBtn(false)} */}
                <h1>
                  Training Completed, Press Run button to start the application
                </h1>
                <h1>
                  You can now continue your work and we will warn you when you
                  bite your nails
                </h1>
              </div>
            ) : (
              <div>
                <h1
                  className={`text ${
                    trainingOneProgress === 'Completed' ? 'completed' : ''
                  }`}
                >
                  Train 1: Don't bite your nails ({trainingOneProgress})
                </h1>
                <h1
                  className={`text ${
                    trainingTwoProgress === 'Completed' ? 'completed' : ''
                  }`}
                >
                  Train 2: Bite your nails ({trainingTwoProgress})
                </h1>
              </div>
            )}
          </div>
        </div>
      ) : (
        <Loader
          type='Puff'
          color='#00BFFF'
          height={100}
          width={100}
          timeout={1500} //1.5 secs
        />
      )}
    </div>
  );
}

export default App;
