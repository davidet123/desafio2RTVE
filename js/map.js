let map;
let geojsonLayer;
let heatmapLayer;
let currentMode = 'choropleth';
let geoJsonData;
let mapInitialized = false;

// HEATMAP CON CANVAS TRANSPARENTE CORRECTAMENTE
L.HeatmapLayer = L.Layer.extend({
  initialize: function(points, options) {
    this.points = points.filter(p => {
      return p && !isNaN(p.lat) && !isNaN(p.lng) && 
             p.value !== null && p.value !== undefined && 
             !isNaN(p.value) && p.value > 0;
    });
    this.maxValue = options.maxValue || 700;
    this.minValue = options.minValue || 0;
    L.setOptions(this, options);
  },

  onAdd: function(map) {
    this._map = map;
    const canvas = this._canvas = document.createElement('canvas');
    canvas.style.position = 'absolute';
    canvas.style.pointerEvents = 'none';
    canvas.style.backgroundColor = 'transparent';
    
    map.getPanes().overlayPane.appendChild(canvas);
    map.on('moveend resize', this._draw, this);
    this._draw();
  },

  onRemove: function(map) {
    if (this._canvas) {
      map.getPanes().overlayPane.removeChild(this._canvas);
      this._canvas = null;
    }
    map.off('moveend resize', this._draw, this);
    this._map = null;
  },

  _draw: function() {
    const map = this._map;
    const canvas = this._canvas;
    const size = map.getSize();
    
    const pixelRatio = window.devicePixelRatio || 1;
    canvas.width = size.x * pixelRatio;
    canvas.height = size.y * pixelRatio;
    canvas.style.width = size.x + 'px';
    canvas.style.height = size.y + 'px';
    
    const ctx = canvas.getContext('2d');
    ctx.scale(pixelRatio, pixelRatio);
    
    const bounds = map.getBounds();
    ctx.clearRect(0, 0, size.x, size.y);
    
    // Radio FIJO para todos los puntos (no depende del valor)
    const radius = 25;
    
    // Ordenar de menor a mayor valor para que los intensos pinten encima
    const sortedPoints = [...this.points].sort((a, b) => a.value - b.value);
    
    sortedPoints.forEach(point => {
      if (!bounds.contains([point.lat, point.lng])) return;
      
      const pixel = map.latLngToContainerPoint([point.lat, point.lng]);
      
      // Normalizar valor 0-1 basado en max 700
      const normalizedValue = Math.max(0, Math.min(point.value / this.maxValue, 1));
      
      // Color según intensidad (escala meteorológica estándar)
      const color = this._getColor(normalizedValue);
      
      // Dibujar círculo con gradiente suave
      const gradient = ctx.createRadialGradient(
        pixel.x, pixel.y, 0,
        pixel.x, pixel.y, radius
      );
      
      gradient.addColorStop(0, color);
      gradient.addColorStop(0.5, color);
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(pixel.x, pixel.y, radius, 0, Math.PI * 2);
      ctx.fill();
    });
  },

  _getColor: function(intensity) {
    // Escala meteorológica estándar:
    // Azul → Verde → Amarillo → Naranja → Rojo → Púrpura
    
    if (intensity < 0.10) return 'rgba(0, 0, 255, 0.6)';      // Azul (0-70mm)
    if (intensity < 0.20) return 'rgba(0, 128, 255, 0.65)';   // Azul claro (70-140mm)
    if (intensity < 0.30) return 'rgba(0, 255, 255, 0.7)';    // Cyan (140-210mm)
    if (intensity < 0.40) return 'rgba(0, 255, 128, 0.75)';   // Verde azulado (210-280mm)
    if (intensity < 0.50) return 'rgba(0, 255, 0, 0.8)';      // Verde (280-350mm)
    if (intensity < 0.60) return 'rgba(128, 255, 0, 0.8)';    // Verde amarillento (350-420mm)
    if (intensity < 0.70) return 'rgba(255, 255, 0, 0.85)';   // Amarillo (420-490mm)
    if (intensity < 0.80) return 'rgba(255, 192, 0, 0.9)';    // Naranja claro (490-560mm)
    if (intensity < 0.90) return 'rgba(255, 128, 0, 0.9)';    // Naranja (560-630mm)
    if (intensity < 0.95) return 'rgba(255, 0, 0, 0.95)';     // Rojo (630-665mm)
    return 'rgba(128, 0, 128, 0.95)';                          // Púrpura (665-700mm+)
  }
});

function initMap() {
  if (mapInitialized) return;
  
  const mapContainer = document.getElementById('map');
  if (!mapContainer) return;
  
  try {
    // ✅ Forzar dimensiones al contenedor
    mapContainer.style.width = '100%';
    mapContainer.style.height = '400px'; // Altura fija para móvil

    const isMobile = window.innerWidth < 768;
    mapContainer.style.height = isMobile ? '50vh' : '60vh';
    
    map = L.map('map', {
      center: [39.4, -0.6],
      zoom: 8,
      // ✅ Deshabilitar preferCanvas para evitar conflictos
      preferCanvas: false
    });

    // Capa base
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap, © CartoDB',
      subdomains: 'abcd',
      maxZoom: 19,
      // ✅ Asegurar que los tiles se renderizan correctamente
      crossOrigin: true
    }).addTo(map);

    mapInitialized = true;
    loadGeoJsonData();
    
  } catch (error) {
    console.error('Error al inicializar el mapa:', error);
    mapInitialized = false;
  }
}

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

function loadGeoJsonData() {
  fetch('data/municipios_con_meteo.geojson')
    .then(res => {
      if (!res.ok) throw new Error('Error al cargar datos GeoJSON');
      return res.json();
    })
    .then(data => {
      geoJsonData = data;
      console.log('Datos cargados:', data.features.length, 'features');
      
      // ✅ Verificar datos
      const conDatos = data.features.filter(f => {
        const v = f.properties?.meteo_prec;
        return v !== null && v !== undefined && !isNaN(v) && v > 0;
      });
      console.log('Features con precipitación > 0:', conDatos.length);
      
      createChoroplethLayer();
      createHeatmapLayer();
      updateLegend();
      
      if (geojsonLayer && geojsonLayer.getBounds) {
        const bounds = geojsonLayer.getBounds();
        if (bounds.isValid()) {
          map.fitBounds(bounds);
        }
      }
      addMapSource('AVAMET');
    })
    .catch(error => {
      console.error('Error:', error);
      showMapError('No se pudieron cargar los datos del mapa');
    });
}

function createChoroplethLayer() {
  if (!geoJsonData) return;
  
  if (geojsonLayer) {
    map.removeLayer(geojsonLayer);
    geojsonLayer = null;
  }
  
  geojsonLayer = L.geoJson(geoJsonData, {
    style: getFeatureStyle,
    onEachFeature: onEachFeature
  });
  
  if (currentMode === 'choropleth') {
    geojsonLayer.addTo(map);
  }
}

function createHeatmapLayer() {
  if (!geoJsonData || !geoJsonData.features) return;
  
  if (heatmapLayer) {
    if (map.hasLayer(heatmapLayer)) {
      map.removeLayer(heatmapLayer);
    }
    heatmapLayer = null;
  }

  const heatPoints = geoJsonData.features
  .filter(f => f.geometry && f.properties?.meteo_prec > 0)
  .map(feature => {
    const centroid = calcularCentroide(feature.geometry);
    return centroid ? {
      lat: centroid[0],
      lng: centroid[1],
      value: Number(feature.properties.meteo_prec)
    } : null;
  })
  .filter(p => p !== null);
  
  // const heatPoints = [];
  
  // geoJsonData.features.forEach(feature => {
  //   const valor = feature.properties?.meteo_prec;
    
  //   // ✅ FILTRAR ESTRICTAMENTE: solo > 0
  //   if (feature.geometry && valor > 0) {
  //     const centroid = calcularCentroide(feature.geometry);
  //     if (centroid) {
  //       heatPoints.push({
  //         lat: centroid[0],
  //         lng: centroid[1],
  //         value: Number(valor)
  //       });
  //     }
  //   }
  // });
  
  console.log('Puntos para heatmap (>0):', heatPoints.length);
  
  if (heatPoints.length === 0) {
    console.warn('No hay datos válidos para el heatmap');
    return;
  }
  
  heatmapLayer = new L.HeatmapLayer(heatPoints, {
    maxValue: 600
  });
  
  if (currentMode === 'heatmap') {
    heatmapLayer.addTo(map);
  }
}

function getFeatureStyle(feature) {
  const value = feature.properties?.meteo_prec;
  
  return {
    fillColor: getPrecipColor(value),
    weight: 1,
    color: "#333",
    fillOpacity: 0.7,
    opacity: 0.8
  };
}

function getPrecipColor(v) {
  // Color para sin datos o 0
  if (v === null || v === undefined || isNaN(v)) return '#f7fcb9'; // Gris oscuro para sin datos
  if (v === 0) return '#f7fcb9'; // Color fondo para 0mm
  
  // Escala de colores para valores > 0
  if (v > 600) return '#49006a';
  if (v > 400) return '#bd0026';
  if (v > 200) return '#f03b20';
  if (v > 100) return '#fd8d3c';
  if (v > 50) return '#fecc5c';
  if (v > 10) return '#ffffb2';
  return '#f7fcb9'; // Muy bajo (0-10mm)
}

function onEachFeature(feature, layer) {
  try {
    const props = feature.properties || {};
    const value = props.meteo_prec;
    const nombre = props.meteo_estacion || props.NAMEUNIT || props.nombre || 'Municipio desconocido';
    
    // ✅ Solo mostrar tooltip si hay datos
    if (value !== null && value !== undefined && !isNaN(value)) {
      layer.bindTooltip(`
        <div class="map-tooltip">
          <strong>${nombre}</strong><br>
          <span>Precipitación: ${Number(value).toFixed(1)} mm</span>
        </div>
      `, {
        sticky: true,
        direction: 'top'
      });
    }
    
    layer.bindPopup(`
      <div class="map-popup">
        <h3>${nombre}</h3>
        <p><strong>Acumulado:</strong> ${value ? Number(value).toFixed(1) + ' mm' : 'Sin datos'}</p>
        ${props.poblacion ? `<p><strong>Población:</strong> ${Number(props.poblacion).toLocaleString()}</p>` : ''}
      </div>
    `);
    
  } catch (error) {
    console.error('Error en onEachFeature:', error);
  }
}

function changeMapMode(mode) {
  if (mode === currentMode || !map) return;
  
  console.log(`Cambiando modo de ${currentMode} a ${mode}`);
  currentMode = mode;
  
  document.querySelectorAll('.map-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  
  const activeBtn = document.getElementById(`mode-${mode}`);
  if (activeBtn) activeBtn.classList.add('active');
  
  if (mode === 'choropleth') {
    if (heatmapLayer && map.hasLayer(heatmapLayer)) {
      map.removeLayer(heatmapLayer);
    }
    if (geojsonLayer && !map.hasLayer(geojsonLayer)) {
      geojsonLayer.addTo(map);
    }
  } else if (mode === 'heatmap') {
    if (geojsonLayer && map.hasLayer(geojsonLayer)) {
      map.removeLayer(geojsonLayer);
    }
    if (heatmapLayer && !map.hasLayer(heatmapLayer)) {
      heatmapLayer.addTo(map);
    }
  }

  document.getElementById('mode-choropleth').setAttribute('aria-pressed', mode === 'choropleth');
  document.getElementById('mode-heatmap').setAttribute('aria-pressed', mode === 'heatmap');
  
  updateLegend();
}

function updateLegend() {
  const legend = document.getElementById('map-legend');
  if (!legend) return;
  
  const title = legend.querySelector('.legend-title');
  const labels = legend.querySelector('.legend-labels');
  const gradient = legend.querySelector('.legend-gradient');
  
  if (!title) return;
  
  if (currentMode === 'choropleth') {
    title.textContent = 'Precipitación (mm)';
    if (labels) {
      labels.innerHTML = `
        <span>S/D</span>
        <span>0</span>
        <span>10</span>
        <span>50</span>
        <span>100</span>
        <span>200</span>
        <span>400+</span>
      `;
    }
    if (gradient) {
      gradient.style.backgroundImage = `linear-gradient(to right, 
        #1e293b 0%, 
        #0f172a 10%,
        #f7fcb9 15%,
        #ffffb2 30%, 
        #fecc5c 45%, 
        #fd8d3c 60%, 
        #f03b20 75%, 
        #bd0026 90%, 
        #49006a 100%
      )`;
    }
  } else if (currentMode === 'heatmap') {
    title.textContent = 'Intensidad (mm)';
    if (labels) {
      labels.innerHTML = `
        <span>0</span>
        <span>100</span>
        <span>300</span>
        <span>500</span>
        <span>700</span>
      `;
    }
    if (gradient) {
      // Gradiente estilo ECMWF/meteorológico
      gradient.style.backgroundImage = `linear-gradient(to right, 
        #0000ff 0%, 
        #0080ff 15%, 
        #00ffff 25%, 
        #00ff80 35%, 
        #00ff00 45%, 
        #80ff00 55%, 
        #ffff00 65%, 
        #ffc000 75%, 
        #ff8000 85%, 
        #ff0000 92%, 
        #800080 100%
      )`;
    }
  }
}

function addMapSource(text) {
  const mapDiv = document.getElementById('map');
  if (!mapDiv) return;

  // eliminar anterior si existe
  const existing = mapDiv.parentElement.querySelector('.map-source');
  if (existing) existing.remove();

  const source = document.createElement('div');
  source.className = 'map-source';
  // source.textContent = `Fuente: ${text}`;
  source.innerHTML = `Fuente: <a href="https://www.avamet.org/mx-meteoxarxa.php?data=2024-10-29" target="_blank" rel="noopener">AVAMET</a>`;


  mapDiv.insertAdjacentElement('afterend', source);
}


function showMapError(message) {
  if (!map) return;
  
  L.popup()
    .setLatLng([39.4, -0.6])
    .setContent(`<div style="color: #f03b20; padding: 15px; text-align: center;">
                  <h4 style="margin-top: 0;">⚠️ Error</h4>
                  <p>${message}</p>
                </div>`)
    .openOn(map);
}

function resetMap() {
  if (map) {
    map.remove();
    map = null;
  }
  
  geojsonLayer = null;
  heatmapLayer = null;
  geoJsonData = null;
  mapInitialized = false;
  currentMode = 'choropleth';
  
  const mapContainer = document.getElementById('map');
  if (mapContainer) {
    mapContainer.innerHTML = '';
    delete mapContainer._leaflet_id;
  }
  
  document.querySelectorAll('.map-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  
  const defaultBtn = document.getElementById('mode-choropleth');
  if (defaultBtn) defaultBtn.classList.add('active');
}

// if (document.readyState === 'loading') {
//   document.addEventListener('DOMContentLoaded', () => setTimeout(initMap, 100));
// } else {
//   setTimeout(initMap, 100);
// }

window.initMap = initMap;
window.changeMapMode = changeMapMode;
window.resetMap = resetMap;