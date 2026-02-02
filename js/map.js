let map;
let geojsonLayer;
let heatmapLayer;
let currentMode = 'choropleth';
let geoJsonData;
let mapInitialized = false;

// HEATMAP CON CANVAS TRANSPARENTE CORRECTAMENTE
L.HeatmapLayer = L.Layer.extend({
  initialize: function(points, options) {
    // ✅ FILTRAR: Solo valores > 0 y válidos
    this.points = points.filter(p => {
      return p && !isNaN(p.lat) && !isNaN(p.lng) && 
             p.value !== null && p.value !== undefined && 
             !isNaN(p.value) && p.value > 0; // SOLO > 0
    });
    this.maxValue = options.maxValue || 600;
    L.setOptions(this, options);
  },

  onAdd: function(map) {
    this._map = map;
    const canvas = this._canvas = document.createElement('canvas');
    canvas.style.position = 'absolute';
    canvas.style.pointerEvents = 'none';
    // ✅ CRÍTICO: No establecer fondo, mantener transparente
    canvas.style.backgroundColor = 'transparent';
    
    map.getPanes().overlayPane.appendChild(canvas);
    map.on('moveend resize', this._draw, this);
    this._draw();
  },

  onRemove: function(map) {
    if (this._canvas) {
      map.getPanes().overlayPane.removeChild(this._canvas);
    }
    map.off('moveend resize', this._draw, this);
  },

  _draw: function() {
    const map = this._map;
    const canvas = this._canvas;
    const size = map.getSize();
    
    // ✅ Ajustar tamaño del canvas
    canvas.width = size.x;
    canvas.height = size.y;
    
    const ctx = canvas.getContext('2d');
    const bounds = map.getBounds();
    
    // Limpiar completamente
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // ✅ Dibujar con opacidad muy baja para ver el mapa base
    this.points.forEach(point => {
      if (!bounds.contains([point.lat, point.lng])) return;
      
      const pixel = map.latLngToContainerPoint([point.lat, point.lng]);
      const intensity = Math.min(point.value / this.maxValue, 1);
      const radius = 20 * Math.pow(2, map.getZoom() - 8);
      
      // Gradiente radial con opacidad controlada
      const gradient = ctx.createRadialGradient(
        pixel.x, pixel.y, 0,
        pixel.x, pixel.y, radius
      );
      
      // ✅ Colores con opacidad fija baja (0.4)
      const color = this._getColor(intensity);
      gradient.addColorStop(0, color);
      gradient.addColorStop(0.4, color.replace('0.4)', '0.2)'));
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(pixel.x, pixel.y, radius, 0, Math.PI * 2);
      ctx.fill();
    });
  },

  _getColor: function(intensity) {
    // Opacidad fija de 0.4 para ver el mapa base
    if (intensity < 0.15) return 'rgba(255, 255, 178, 0.4)';
    if (intensity < 0.3) return 'rgba(254, 204, 92, 0.4)';
    if (intensity < 0.5) return 'rgba(253, 141, 60, 0.4)';
    if (intensity < 0.7) return 'rgba(240, 59, 32, 0.4)';
    if (intensity < 0.85) return 'rgba(189, 0, 38, 0.4)';
    return 'rgba(73, 0, 106, 0.5)';
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
  
  const heatPoints = [];
  
  geoJsonData.features.forEach(feature => {
    const valor = feature.properties?.meteo_prec;
    
    // ✅ FILTRAR ESTRICTAMENTE: solo > 0
    if (feature.geometry && valor > 0) {
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
  // ✅ Manejar null/undefined/0
  if (v === null || v === undefined || v === 0) return 'transparent';
  if (v > 600) return '#49006a';
  if (v > 400) return '#bd0026';
  if (v > 200) return '#f03b20';
  if (v > 100) return '#fd8d3c';
  if (v > 50) return '#fecc5c';
  return '#ffffb2';
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
        <span>0</span>
        <span>50</span>
        <span>100</span>
        <span>200</span>
        <span>400</span>
        <span>600+</span>
      `;
    }
    if (gradient) gradient.style.display = 'block';
  } else if (currentMode === 'heatmap') {
    title.textContent = 'Intensidad';
    if (labels) {
      labels.innerHTML = `
        <span>Baja</span>
        <span></span>
        <span>Media</span>
        <span></span>
        <span>Alta</span>
      `;
    }
    if (gradient) gradient.style.display = 'block';
  }
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

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => setTimeout(initMap, 100));
} else {
  setTimeout(initMap, 100);
}

window.initMap = initMap;
window.changeMapMode = changeMapMode;
window.resetMap = resetMap;