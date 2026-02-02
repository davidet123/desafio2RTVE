const scenes = [
  () => map.setView([40.2, -3.5], 6),                        // 1
  () => danaLayer.addTo(map),                                // 2
  () => map.setView([39.4, -0.4], 8),                        // 3
  () => geojsonLayer.addTo(map),                             // 4
  () => geojsonLayer.setStyle(f => ({
        fillColor: f.properties.meteo_prec > 300 ? '#800026' : '#ccc',
        weight: 1, color: '#333', fillOpacity: 0.8
      })),                                                   // 5
  () => reliefLayer.addTo(map),                              // 6
  () => map.setView([39.5, -0.6], 7)                         // 7
];
