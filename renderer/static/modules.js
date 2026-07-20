// Find the latest version by visiting https://unpkg.com/three, currently it's 0.126.1
import * as THREE from "https://unpkg.com/three@0.126.1/build/three.module.js";
import { OrbitControls } from "https://unpkg.com/three@0.126.1/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "https://unpkg.com/three@0.126.1/examples/jsm/loaders/GLTFLoader.js";

const renderwindow = document.getElementById("middle-image-container");

const loader = new GLTFLoader();

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, 500 / 900, 0.1, 2000);

const light = new THREE.DirectionalLight(0xffffff, 1); // soft white light
const renderer = new THREE.WebGLRenderer({ alpha: true });
// renderer.setClearColor(0xffffff, 0);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableZoom = false;
controls.enablePan = false;
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(500, 900);
renderer.setAnimationLoop(animate);

renderwindow.appendChild(renderer.domElement);
// scene.background = new THREE.Color(0xffffff);

light.position.set(0, 0, -10);
scene.add(light);

camera.position.set(0, 0, 5);

function animate() {
  renderer.render(scene, camera);
}

loader.load(
  "./untitled.glb",
  function (gltf) {
    gltf.scene.scale.set(0.5, 0.5, 0.5);
    gltf.scene.position.set(-1.35, 0, 2);

    scene.add(gltf.scene);
    // camera.lookAt(gltf.scene.position);
  },
  undefined,
  function (error) {
    console.error(error);
  }
);
