// // main.js

// // Inicializar mapa centrado en Comunidad Valenciana
// const map = L.map('map').setView([39.5, -0.5], 8);

// // Capa base
// L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
//   attribution: '&copy; OpenStreetMap contributors'
// }).addTo(map);

// // Función para colorear según precipitación
// function getColor(d) {
//   return d > 200 ? '#081d58' :
//          d > 150 ? '#253494' :
//          d > 100 ? '#225ea8' :
//          d > 50  ? '#1d91c0' :
//          d > 20  ? '#41b6c4' :
//          d > 0   ? '#a1dab4' :
//                    '#f0f0f0'; // sin lluvia
// }

// // Estilo de polígonos
// function style(feature) {
//   return {
//     fillColor: getColor(feature.properties.precipitacion_mm),
//     weight: 1,
//     opacity: 1,
//     color: 'white',
//     fillOpacity: 0.7
//   };
// }

// function onEachFeature(feature, layer) {
//   const props = feature.properties;
//   layer.bindPopup(`
//     <strong>${props.NAMEUNIT}</strong><br>
//     Precipitación: ${props.precipitacion_mm} mm<br>
//     Estación: ${props.estacion} (${props.estacion})<br>
//   `);
// }

// // Cargar GeoJSON
// fetch('data/municipios_valencia_con_precipitacion.geojson')
//   .then(res => res.json())
//   .then(data => {
//     L.geoJSON(data, {
//       style: style,
//       onEachFeature: onEachFeature
//     }).addTo(map);
//   })
//   .catch(err => console.error(err));
// 

(function() {
  'use strict';

  const CONFIG = {
    centroInicial: [39.4, -0.6],
    zoomInicial: 8,
    archivoGeoJSON: 'data/municipios_con_meteo.geojson',
    heatmap: {
      radius: 25,
      blur: 15
    },
    variables: {
      precipitacion: {
        campo: 'meteo_prec',
        nombre: 'Precipitación',
        unidad: 'mm',
        maxHeatmap: 600,
        tipo: 'precipitacion'
      },
      t_media: {
        campo: 'meteo_t_mit',
        nombre: 'Temperatura Media',
        unidad: '°C',
        maxHeatmap: 40,
        tipo: 'temperatura'
      },
      t_maxima: {
        campo: 'meteo_t_max',
        nombre: 'Temperatura Máxima',
        unidad: '°C',
        maxHeatmap: 45,
        tipo: 'temperatura'
      },
      t_minima: {
        campo: 'meteo_t_min',
        nombre: 'Temperatura Mínima',
        unidad: '°C',
        maxHeatmap: 30,
        tipo: 'temperatura'
      },
      viento: {
        campo: 'meteo_vent_max',
        nombre: 'Viento Máximo',
        unidad: 'km/h',
        maxHeatmap: 100,
        tipo: 'viento'
      }
    }
  };

  let map, geojsonLayer, heatmapLayer;
  let currentMode = 'choropleth';
  let currentVariable = 'precipitacion';
  let geojsonData = null;

  function calcularCentroide(geometry) {
    let coords;
    
    if (geometry.type === 'MultiPolygon') {
      let maxPoints = 0;
      let bestPolygon = geometry.coordinates[0];
      for (const polygon of geometry.coordinates) {
        if (polygon[0].length > maxPoints) {
          maxPoints = polygon[0].length;
          bestPolygon = polygon;
        }
      }
      coords = bestPolygon;
    } else if (geometry.type === 'Polygon') {
      coords = geometry.coordinates;
    } else {
      return null;
    }
    
    const ring = coords[0];
    if (!ring || ring.length < 3) return null;
    
    let x = 0, y = 0, area = 0;
    
    for (let i = 0; i < ring.length - 1; i++) {
      const [x1, y1] = ring[i];
      const [x2, y2] = ring[i + 1];
      const a = x1 * y2 - x2 * y1;
      area += a;
      x += (x1 + x2) * a;
      y += (y1 + y2) * a;
    }
    
    if (Math.abs(area) < 1e-10) {
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (const [x, y] of ring) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
      return [(minY + maxY) / 2, (minX + maxX) / 2];
    }
    
    area = area / 2;
    x = x / (6 * area);
    y = y / (6 * area);
    
    if (isNaN(x) || isNaN(y) || !isFinite(x) || !isFinite(y)) {
      return null;
    }
    
    return [y, x];
  }

  // CORREGIDO: Maneja correctamente el valor 0 y null/undefined
  function getColor(valor, tipo) {
    // Importante: !0 es true en JS, por eso usamos === null
    if (valor === null || valor === undefined || isNaN(valor)) return '#d9d9d9';
    
    // Convertir a número por si acaso viene como string
    const v = Number(valor);
    
    if (tipo === 'precipitacion') {
      if (v >= 600) return '#49006a';
      if (v >= 400) return '#bd0026';
      if (v >= 200) return '#f03b20';
      if (v >= 100) return '#fd8d3c';
      if (v >= 50) return '#fecc5c';
      if (v >= 20) return '#ffffb2';
      if (v >= 5) return '#c6dbef';
      return '#f7fbff';
    }
    
    if (tipo === 'temperatura') {
      if (v <= 0) return '#313695';
      if (v <= 5) return '#4575b4';
      if (v <= 10) return '#74add1';
      if (v <= 15) return '#abd9e9';
      if (v <= 20) return '#e0f3f8';
      if (v <= 25) return '#fee090';
      if (v <= 30) return '#fdae61';
      if (v <= 35) return '#f46d43';
      return '#d73027';
    }
    
    if (tipo === 'viento') {
      if (v >= 100) return '#67001f';
      if (v >= 80) return '#b2182b';
      if (v >= 60) return '#d6604d';
      if (v >= 40) return '#f4a582';
      if (v >= 20) return '#fddbc7';
      return '#92c5de';
    }
    
    return '#d9d9d9';
  }

  function style(feature) {
    const config = CONFIG.variables[currentVariable];
    const valor = feature.properties[config.campo];
    
    return {
      fillColor: getColor(valor, config.tipo),
      weight: 1,
      opacity: 1,
      color: '#666',
      fillOpacity: 0.75
    };
  }

  L.HeatmapLayer = L.Layer.extend({
    initialize: function(points, options) {
      this.points = points.filter(p => p && !isNaN(p.lat) && !isNaN(p.lng) && p.value !== null);
      this.maxValue = options.maxValue || 100;
      this.tipo = options.tipo || 'precipitacion';
      L.setOptions(this, options);
    },

    onAdd: function(map) {
      this._map = map;
      const canvas = this._canvas = document.createElement('canvas');
      canvas.style.position = 'absolute';
      canvas.style.pointerEvents = 'none';
      canvas.style.zIndex = 200;
      
      map.getPanes().overlayPane.appendChild(canvas);
      map.on('moveend resize', this._redraw, this);
      this._redraw();
    },

    onRemove: function(map) {
      map.getPanes().overlayPane.removeChild(this._canvas);
      map.off('moveend resize', this._redraw, this);
    },

    _getColorForIntensity: function(intensity) {
      if (this.tipo === 'temperatura') {
        const r = Math.min(255, intensity * 255);
        const b = Math.min(255, (1 - intensity) * 255);
        return `rgba(${Math.floor(r)}, 50, ${Math.floor(b)}, ${Math.min(intensity + 0.2, 1)})`;
      } else if (this.tipo === 'viento') {
        const r = Math.min(255, intensity * 255);
        const g = Math.min(255, (1 - intensity) * 255);
        return `rgba(${Math.floor(r)}, ${Math.floor(g)}, 0, ${Math.min(intensity + 0.2, 1)})`;
      } else {
        if (intensity < 0.3) return `rgba(0, 0, 255, ${intensity})`;
        if (intensity < 0.6) return `rgba(0, 255, 255, ${intensity})`;
        if (intensity < 0.8) return `rgba(255, 255, 0, ${intensity})`;
        return `rgba(255, 0, 0, ${Math.min(intensity + 0.2, 1)})`;
      }
    },

    _redraw: function() {
      const map = this._map;
      const canvas = this._canvas;
      const size = map.getSize();
      const bounds = map.getBounds();
      
      canvas.width = size.x;
      canvas.height = size.y;
      
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = 'screen';
      
      this.points.forEach(point => {
        if (!point || isNaN(point.lat) || isNaN(point.lng)) return;
        if (!bounds.contains([point.lat, point.lng])) return;
        
        const intensity = Math.min(point.value / this.maxValue, 1);
        if (intensity <= 0 || isNaN(intensity)) return;
        
        const pixel = map.latLngToContainerPoint([point.lat, point.lng]);
        const radius = CONFIG.heatmap.radius * (1 + intensity) * Math.pow(2, map.getZoom() - 8);
        
        const gradient = ctx.createRadialGradient(
          pixel.x, pixel.y, 0,
          pixel.x, pixel.y, radius
        );
        
        const color = this._getColorForIntensity(intensity);
        gradient.addColorStop(0, color);
        gradient.addColorStop(1, 'rgba(0,0,0,0)');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(pixel.x, pixel.y, radius, 0, Math.PI * 2);
        ctx.fill();
      });
      
      ctx.globalCompositeOperation = 'source-over';
      ctx.filter = `blur(${CONFIG.heatmap.blur}px)`;
      ctx.drawImage(canvas, 0, 0);
      ctx.filter = 'none';
    }
  });

  function initMap() {
    map = L.map('map', {
      center: CONFIG.centroInicial,
      zoom: CONFIG.zoomInicial
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 18
    }).addTo(map);
  }

  function createControls() {
    const info = L.control({position: 'topright'});
    info.onAdd = function() {
      this._div = L.DomUtil.create('div', 'info-panel');
      this.update();
      return this._div;
    };
    
    info.update = function(props) {
      if (!props) {
        this._div.innerHTML = '<h3>Datos Meteorológicos</h3>' +
          '<p>Variable: <strong>' + CONFIG.variables[currentVariable].nombre + '</strong><br>' +
          'Modo: <strong>' + (currentMode === 'heatmap' ? 'Mapa de Calor' : 'Municipios') + '</strong><br>' +
          'Pasa el ratón para ver datos</p>';
        return;
      }
      
      const config = CONFIG.variables[currentVariable];
      const valor = props[config.campo];
      
      let html = `<h3>${props.NAMEUNIT}</h3>`;
      
      // Debug: mostrar si hay datos o no
      const tieneDatos = props.meteo_estacion !== undefined;
      
      if (tieneDatos) {
        html += `<div style="font-size:11px;color:#666;margin-bottom:8px;">`;
        html += `Estación: ${props.meteo_estacion}`;
        if (props.meteo_ubicacion) html += ` (${props.meteo_ubicacion})`;
        html += `</div>`;
        
        // Mostrar todos los datos disponibles
        const datos = [];
        if (props.meteo_t_min !== null) datos.push(`Temp: ${props.meteo_t_min}° / ${props.meteo_t_mit}° / ${props.meteo_t_max}°`);
        if (props.meteo_prec !== null) datos.push(`Precip: ${props.meteo_prec}mm`);
        if (props.meteo_vent_max !== null) datos.push(`Viento: ${props.meteo_vent_max}km/h ${props.meteo_vent_dir || ''}`);
        if (props.meteo_hr_mit !== null) datos.push(`Humedad: ${props.meteo_hr_mit}%`);
        
        html += `<div style="font-size:12px;line-height:1.4;">${datos.join('<br>')}</div>`;
        
        // Resaltar la variable seleccionada
        if (valor !== null && valor !== undefined) {
          const color = getColor(valor, config.tipo);
          html += `<div style="margin-top:8px;padding-top:8px;border-top:1px solid #ddd;">`;
          html += `<strong style="font-size:16px;color:${color}">${config.nombre}: ${valor}${config.unidad}</strong>`;
          html += `</div>`;
        }
      } else {
        html += '<div style="color:#999;">Sin datos meteorológicos</div>';
      }
      
      this._div.innerHTML = html;
    };
    
    info.addTo(map);
    window.infoControl = info;

    const buttons = L.control({position: 'topleft'});
    buttons.onAdd = function() {
      const div = L.DomUtil.create('div', 'controls');
      
      let html = '<select id="var-select" onchange="window.changeVariable(this.value)" style="margin-bottom:8px;padding:4px;width:180px;">';
      for (const [key, val] of Object.entries(CONFIG.variables)) {
        html += `<option value="${key}" ${key === currentVariable ? 'selected' : ''}>${val.nombre}</option>`;
      }
      html += '</select><br>';
      
      html += `<button class="btn ${currentMode === 'choropleth' ? 'active' : ''}" onclick="window.toggleMode('choropleth')">Municipios</button>`;
      html += `<button class="btn ${currentMode === 'heatmap' ? 'active' : ''}" onclick="window.toggleMode('heatmap')">Calor</button>`;
      
      div.innerHTML = html;
      return div;
    };
    buttons.addTo(map);
  }

  function createLegend() {
    if (window.legendControl) map.removeControl(window.legendControl);
    
    const config = CONFIG.variables[currentVariable];
    const legend = L.control({position: 'bottomright'});
    
    legend.onAdd = function() {
      const div = L.DomUtil.create('div', 'legend');
      div.innerHTML = `<h4>${config.nombre} (${config.unidad})</h4>`;
      
      if (currentMode === 'heatmap') {
        div.innerHTML += `
          <div style="background: linear-gradient(to right, blue, cyan, yellow, red); height: 20px; margin: 5px 0;"></div>
          <div style="display:flex;justify-content:space-between;font-size:11px;">
            <span>0</span><span>${config.maxHeatmap/2}</span><span>${config.maxHeatmap}+</span>
          </div>`;
      } else {
        const rangos = [];
        if (config.tipo === 'precipitacion') {
          rangos.push({min: 600, label: '> 600', color: getColor(700, 'precipitacion')});
          rangos.push({min: 400, label: '400-600', color: getColor(500, 'precipitacion')});
          rangos.push({min: 200, label: '200-400', color: getColor(300, 'precipitacion')});
          rangos.push({min: 100, label: '100-200', color: getColor(150, 'precipitacion')});
          rangos.push({min: 50, label: '50-100', color: getColor(75, 'precipitacion')});
          rangos.push({min: 20, label: '20-50', color: getColor(35, 'precipitacion')});
          rangos.push({min: 5, label: '5-20', color: getColor(10, 'precipitacion')});
          rangos.push({min: 0, label: '0-5', color: getColor(0, 'precipitacion')});
        } else if (config.tipo === 'temperatura') {
          rangos.push({min: 35, label: '> 35°', color: getColor(40, 'temperatura')});
          rangos.push({min: 30, label: '30-35°', color: getColor(32, 'temperatura')});
          rangos.push({min: 25, label: '25-30°', color: getColor(27, 'temperatura')});
          rangos.push({min: 20, label: '20-25°', color: getColor(22, 'temperatura')});
          rangos.push({min: 15, label: '15-20°', color: getColor(17, 'temperatura')});
          rangos.push({min: 10, label: '10-15°', color: getColor(12, 'temperatura')});
          rangos.push({min: 5, label: '5-10°', color: getColor(7, 'temperatura')});
          rangos.push({min: 0, label: '< 5°', color: getColor(0, 'temperatura')});
        } else if (config.tipo === 'viento') {
          rangos.push({min: 100, label: '> 100', color: getColor(110, 'viento')});
          rangos.push({min: 80, label: '80-100', color: getColor(90, 'viento')});
          rangos.push({min: 60, label: '60-80', color: getColor(70, 'viento')});
          rangos.push({min: 40, label: '40-60', color: getColor(50, 'viento')});
          rangos.push({min: 20, label: '20-40', color: getColor(30, 'viento')});
          rangos.push({min: 0, label: '< 20', color: getColor(10, 'viento')});
        }
        
        rangos.forEach(r => {
          div.innerHTML += `<div style="background:${r.color};padding:3px;font-size:11px;color:${r.min > 30 && config.tipo === 'temperatura' ? 'white' : 'black'};border-bottom:1px solid #fff;">${r.label}</div>`;
        });
        div.innerHTML += `<div style="background:#d9d9d9;padding:3px;font-size:11px;margin-top:2px;">Sin datos</div>`;
      }
      
      return div;
    };
    
    legend.addTo(map);
    window.legendControl = legend;
  }

  window.changeVariable = function(variable) {
    if (variable === currentVariable) return;
    currentVariable = variable;
    updateVisualization();
  };

  window.toggleMode = function(mode) {
    if (mode === currentMode) return;
    currentMode = mode;
    updateVisualization();
  };

  function updateVisualization() {
    const config = CONFIG.variables[currentVariable];
    
    if (currentMode === 'heatmap') {
      if (geojsonLayer) map.removeLayer(geojsonLayer);
      if (heatmapLayer) map.addLayer(heatmapLayer);
    } else {
      if (heatmapLayer) map.removeLayer(heatmapLayer);
      if (geojsonLayer) {
        geojsonLayer.setStyle(style);
        map.addLayer(geojsonLayer);
      }
    }
    
    createLegend();
    window.infoControl.update();
    
    // Actualizar botones
    document.querySelectorAll('.btn').forEach(btn => {
      btn.classList.toggle('active', 
        (currentMode === 'choropleth' && btn.textContent.includes('Municipios')) ||
        (currentMode === 'heatmap' && btn.textContent.includes('Calor'))
      );
    });
  }

  async function loadData() {
    const loading = document.createElement('div');
    loading.className = 'loading-overlay';
    loading.innerHTML = '<div style="padding:20px;">Cargando...</div>';
    document.getElementById('map').appendChild(loading);

    try {
      const response = await fetch(CONFIG.archivoGeoJSON);
      if (!response.ok) throw new Error('No se pudo cargar el archivo');
      geojsonData = await response.json();

      console.log('Datos cargados:', geojsonData.features.length, 'features');
      console.log('Ejemplo:', geojsonData.features[0].properties);

      // Crear capa de polígonos
      geojsonLayer = L.geoJson(geojsonData, {
        style: style,
        onEachFeature: function(feature, layer) {
          layer.on({
            mouseover: (e) => {
              layer.setStyle({weight: 3, color: '#333'});
              window.infoControl.update(feature.properties);
            },
            mouseout: (e) => {
              geojsonLayer.resetStyle(e.target);
              window.infoControl.update();
            }
          });
        }
      });

      // Crear heatmap
      const config = CONFIG.variables[currentVariable];
      const heatPoints = [];
      
      geojsonData.features.forEach(feature => {
        const valor = feature.properties[config.campo];
        // Aceptar 0 como valor válido, rechazar solo null/undefined
        if (feature.geometry && valor !== null && valor !== undefined && !isNaN(valor)) {
          const centroid = calcularCentroide(feature.geometry);
          if (centroid) {
            heatPoints.push({
              lat: centroid[0],
              lng: centroid[1],
              value: Number(valor)
            });
          }
        }
      });
      
      console.log('Puntos para heatmap:', heatPoints.length);

      heatmapLayer = new L.HeatmapLayer(heatPoints, {
        maxValue: config.maxHeatmap,
        tipo: config.tipo
      });

      map.addLayer(geojsonLayer);
      
      if (geojsonLayer.getBounds().isValid()) {
        map.fitBounds(geojsonLayer.getBounds().pad(0.1));
      }

    } catch (error) {
      console.error(error);
      alert('Error cargando datos: ' + error.message);
    } finally {
      loading.remove();
    }
  }

  function init() {
    initMap();
    createControls();
    createLegend();
    loadData();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();