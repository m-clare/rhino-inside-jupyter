// Copyright (c) Maryanne Wachter
// Distributed under the terms of the Modified BSD License.
import {
  DOMWidgetModel,
  DOMWidgetView,
  ISerializers,
} from '@jupyter-widgets/base';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import rhino3dm from 'rhino3dm';

import { MODULE_NAME, MODULE_VERSION } from './version';

export class Rhino3dmModel extends DOMWidgetModel {
  defaults() {
    return {
      ...super.defaults(),
      _model_name: Rhino3dmModel.model_name,
      _model_module: Rhino3dmModel.model_module,
      _model_module_version: Rhino3dmModel.model_module_version,
      _view_name: Rhino3dmModel.view_name,
      _view_module: Rhino3dmModel.view_module,
      _view_module_version: Rhino3dmModel.view_module_version,
      rhino_file: '',
      widget_params: {},
    };
  }

  static serializers: ISerializers = {
    ...DOMWidgetModel.serializers,
  };

  static model_name = 'Rhino3dmModel';
  static model_module = MODULE_NAME;
  static model_module_version = MODULE_VERSION;

  static view_name = 'Rhino3dmView';
  static view_module = MODULE_NAME;
  static view_module_version = MODULE_VERSION;
}

export class Rhino3dmView extends DOMWidgetView {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;

  render() {
    this.el.classList.add('custom-widget');
    const width = this.model.get('widget_params').width || 800;
    const height = this.model.get('widget_params').height || 600;
    this.init(width, height);
    this.loadRhinoFile();
  }

  init(width: number, height: number) {
    THREE.Object3D.DEFAULT_UP = new THREE.Vector3(0, 0, 1);
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(1, 1, 1);

    this.camera = new THREE.PerspectiveCamera(45, width / height, 1, 1000);
    this.camera.position.set(26, -40, 5);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(width, height);
    this.el.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);

    window.addEventListener(
      'resize',
      () => this.onWindowResize(width, height),
      false,
    );

    this.animate();
  }

  async loadRhinoFile() {
    try {
      const rhino = await rhino3dm();

      const buffer = this.base64ToArrayBuffer(this.model.get('rhino_file'));
      const arr = new Uint8Array(buffer);
      if (arr.length === 0) {
        throw new Error('Rhino file data is empty');
      }

      const doc = rhino.File3dm.fromByteArray(arr);

      if (!doc) {
        throw new Error('Failed to parse Rhino file');
      }

      this.processRhinoObjects(doc, rhino);
    } catch (error: any) {
      if (error instanceof Error) {
        console.error('Error loading Rhino file:', error);
      }
    }
  }

  processRhinoObjects(doc: any, rhino: any) {
    const material = new THREE.MeshNormalMaterial();
    const objects = doc.objects();
    for (let i = 0; i < objects.count; i++) {
      const mesh = objects.get(i).geometry();
      if (mesh instanceof rhino.Mesh) {
        const threeMesh = this.meshToThreejs(mesh, material);
        this.scene.add(threeMesh);
      }
    }
    this.fitCameraToScene();
  }

  meshToThreejs(mesh: any, material: THREE.Material) {
    const loader = new THREE.BufferGeometryLoader();
    const geometry = loader.parse(mesh.toThreejsJSON());
    return new THREE.Mesh(geometry, material);
  }

  fitCameraToScene() {
    const box = new THREE.Box3().setFromObject(this.scene);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    const maxSize = Math.max(size.x, size.y, size.z);
    const fitHeightDistance =
      maxSize / (2 * Math.atan((Math.PI * this.camera.fov) / 360));
    const fitWidthDistance = fitHeightDistance / this.camera.aspect;
    const distance = 1.2 * Math.max(fitHeightDistance, fitWidthDistance);

    this.camera.near = distance / 100;
    this.camera.far = distance * 100;
    this.camera.updateProjectionMatrix();

    this.camera.position.copy(center);
    this.camera.position.z += distance;
    this.controls.target.copy(center);
    this.controls.update();
  }

  animate = () => {
    requestAnimationFrame(this.animate);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };

  base64ToArrayBuffer(base64: string) {
    const binary_string = window.atob(base64);
    const bytes = new Uint8Array(binary_string.length);
    for (let i = 0; i < binary_string.length; i++) {
      bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes.buffer;
  }

  onWindowResize(width: number, height: number) {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }
}
