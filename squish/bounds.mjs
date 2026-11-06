import {Box3} from './vendor/three.module.js';

export function waxBounds(pivot, model) {
  // Dipping can interrupt the squeeze. Measure the resting toy in shell-local
  // coordinates, rather than using the previous frame's compressed matrix.
  pivot.scale.set(1, 1, 1);
  pivot.position.set(0, 0, 0);
  pivot.updateWorldMatrix(true, true);
  return new Box3().setFromObject(model).applyMatrix4(pivot.matrixWorld.clone().invert());
}
