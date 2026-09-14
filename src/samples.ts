import type { Project } from './model';
export const sampleImage = require('../assets/sample-botanical-embroidery.png');
export const sampleProject: Project = {
  id: 'sample-botanical', title: 'The autumn leaves', sample: true, status: 'paused',
  createdAt: '2026-09-13T12:00:00.000Z', updatedAt: '2026-09-13T12:00:00.000Z',
  checkpoints: [{ id: 'sample-point', photo: { uri: 'sample:botanical', width: 1448, height: 1086 },
    pin: { x: 0.497, y: 0.454 }, nextMove: 'Finish the right half of the rust leaf.',
    detail: 'Two strands. Keep the stitches angled toward the center stem.', createdAt: '2026-09-13T12:00:00.000Z' }],
};
