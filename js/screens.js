import * as Map from './map.js';

export const screens = {
  1: () => {
    Map.resetView();
  },
  2: () => {
    // esquema conceptual, por ahora solo zoom
    Map.zoomTo([[38, -1], [41, 1]]);
  },
  3: () => {
    Map.zoomTo([[38.5, -0.8], [40.5, 0.5]]);
  },
  4: () => {
    window.setMode('precipitacion');
  },
  5: () => {
    window.filterExtremes(200);
  },
  6: () => {
    Map.activateRelief();
  },
  7: () => {
    Map.resetView();
  }
};
