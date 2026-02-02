let comboChart, multiLineChart, seaTempChart;
let precipData;

function loadPrecipitationCharts() {
  fetch('data/datos_precipitacion.json')
    .then(res => res.json())
    .then(data => {
      precipData = data;
      createStationButtons(data.estaciones);
      initComboChart(data);
      initMultiChart(data);
    });
}

function createStationButtons(stations) {
  const container = document.getElementById("stationSelector");
  Object.entries(stations).forEach(([key, st]) => {
    const btn = document.createElement("button");
    btn.textContent = st.label;
    btn.className = "selector-btn";
    btn.onclick = () => updateComboChart(key);
    container.appendChild(btn);
  });
}

function initComboChart(data) {
  const ctx = document.getElementById('comboChart');
  comboChart = new Chart(ctx, {
    type: 'bar', // Tipo principal
    data: { 
      labels: data.config.labels, 
      datasets: [] 
    },
    options: { 
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: {
          position: 'top',
        },
        tooltip: {
          mode: 'index',
          intersect: false
        }
      },
      scales: {
        x: {
          title: {
            display: true,
            text: 'Tiempo'
          }
        },
        y: {
          type: 'linear',
          position: 'left', // Eje izquierdo para intensidad
          title: {
            display: true,
            text: 'Intensidad (mm/h)'
          },
          grid: {
            drawBorder: true
          },
          beginAtZero: true
        },
        y1: {
          type: 'linear',
          position: 'right', // Eje derecho para acumulado
          title: {
            display: true,
            text: 'Acumulado (mm)'
          },
          grid: {
            drawOnChartArea: false, // No dibujar grid del eje derecho
          },
          beginAtZero: true
        }
      }
    }
  });
}

function updateComboChart(stationKey) {
  const st = precipData.estaciones[stationKey];
  comboChart.data.datasets = [
    {
      type: 'line',
      label: 'Intensidad',
      data: st.intensidad,
      borderColor: '#36a2eb',
      backgroundColor: 'transparent',
      borderWidth: 3,
      tension: 0.2, // Línea suavizada
      fill: false
    },
    {
      type: 'line',
      label: 'Acumulado',
      data: st.acumulado,
      yAxisID: 'y1',
      borderColor: '#ff6384',
      backgroundColor: 'rgba(255, 99, 132, 0.4)',
      borderWidth: 0, // Sin borde para efecto de área pura
      pointRadius: 0,
      tension: 0.3, // Curva suavizada
      fill: {
        target: 'origin',
        above: 'rgba(255, 99, 132, 0.4)' // Relleno desde el eje X
      }
    }
  ];
  comboChart.update();
}

function initMultiChart(data) {
  const ctx = document.getElementById('multiLineChart');
  multiLineChart = new Chart(ctx, {
    type: 'line',
    data: { 
      labels: data.config.labels, 
      datasets: [] 
    },
    options: { 
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false // Ocultamos la leyenda del gráfico ya que tendremos checkboxes
        },
        tooltip: {
          mode: 'index',
          intersect: false
        }
      },
      scales: {
        x: {
          title: {
            display: true,
            text: 'Tiempo'
          }
        },
        y: {
          title: {
            display: true,
            text: 'Intensidad (mm/h)'
          },
          beginAtZero: true
        }
      },
      interaction: {
        mode: 'nearest',
        axis: 'x',
        intersect: false
      },
      elements: {
        line: {
          tension: 0.3
        }
      }
    }
  });

  const container = document.getElementById("multiStationSelector");
  container.innerHTML = ''; // Limpiar contenedor

  Object.entries(data.estaciones).forEach(([key, st]) => {
    const color = getColorForStation(key);
    
    // Crear contenedor para cada checkbox
    const checkboxContainer = document.createElement("div");
    checkboxContainer.className = "checkbox-container";
    checkboxContainer.style.marginBottom = "5px";
    
    // Crear checkbox
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.id = `station-${key}`;
    checkbox.dataset.key = key;
    checkbox.dataset.label = st.label;
    checkbox.onchange = (e) => toggleStationLine(key, st, e);
    
    // Crear label con color
    const label = document.createElement("label");
    label.htmlFor = `station-${key}`;
    label.style.display = "flex";
    label.style.alignItems = "center";
    label.style.cursor = "pointer";
    label.style.padding = "5px 8px";
    label.style.borderRadius = "4px";
    label.style.transition = "background 0.3s";
    
    // Marcador de color
    const colorMarker = document.createElement("span");
    colorMarker.className = "color-marker";
    colorMarker.style.width = "15px";
    colorMarker.style.height = "15px";
    colorMarker.style.backgroundColor = color;
    colorMarker.style.borderRadius = "3px";
    colorMarker.style.marginRight = "8px";
    colorMarker.style.display = "inline-block";
    colorMarker.style.border = "2px solid " + color;
    
    // Texto del label
    const labelText = document.createTextNode(st.label);
    
    label.appendChild(colorMarker);
    label.appendChild(labelText);
    
    checkboxContainer.appendChild(checkbox);
    checkboxContainer.appendChild(label);
    container.appendChild(checkboxContainer);
  });
}

function toggleStationLine(key, st, event) {
  const checkbox = event.target;
  const isChecked = checkbox.checked;
  const existingIndex = multiLineChart.data.datasets.findIndex(d => d.key === key);
  
  if (!isChecked) {
    if (existingIndex >= 0) {
      multiLineChart.data.datasets.splice(existingIndex, 1);
    }
  } else {
    const color = getColorForStation(key);
    const newDataset = {
      key: key,
      label: st.label,
      data: st.intensidad,
      borderColor: color,
      backgroundColor: color + '40', // Más transparencia para fondo oscuro
      borderWidth: 2,
      tension: 0.3,
      fill: false,
      pointRadius: 3,
      pointBackgroundColor: color,
      pointBorderColor: '#0f172a', // Borde oscuro para los puntos
      pointBorderWidth: 1
    };
    
    multiLineChart.data.datasets.push(newDataset);
  }
  
  // Aplicar estilos al label cuando está activo - ajustado para fondo oscuro
  const label = checkbox.nextElementSibling;
  if (isChecked) {
    label.style.backgroundColor = 'rgba(30, 41, 59, 0.8)'; // Fondo azul oscuro
    label.style.borderColor = getColorForStation(key);
    label.style.color = '#f1f5f9'; // Texto más blanco
    label.style.fontWeight = '500';
  } else {
    label.style.backgroundColor = 'rgba(15, 23, 42, 0.8)'; // Volver al fondo original
    label.style.borderColor = 'rgba(255, 255, 255, 0.15)';
    label.style.color = '#e2e8f0';
    label.style.fontWeight = 'normal';
  }
  
  multiLineChart.update();
}

// Función para asignar colores únicos a cada estación
function getColorForStation(key) {
  // Colores más vibrantes para contrastar con fondo oscuro
  const colors = [
    '#60a5fa', // Azul brillante
    '#f87171', // Rojo coral
    '#fbbf24', // Amarillo dorado
    '#34d399', // Verde esmeralda
    '#a78bfa', // Violeta
    '#f472b6', // Rosa
    '#2dd4bf', // Turquesa
    '#fb923c', // Naranja
    '#818cf8', // Azul índigo
    '#f59e0b', // Ámbar
    '#10b981', // Verde esmeralda
    '#8b5cf6', // Púrpura
    '#ef4444', // Rojo
    '#3b82f6', // Azul
    '#ec4899'  // Rosa fucsia
  ];
  
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = key.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}

// Función para aplicar el efecto de resaltado (solo una línea en color)
function applyHighlightEffect() {
  const datasets = multiLineChart.data.datasets;
  
  // Si hay datasets, asegurarse de que solo el último tenga color vivo
  if (datasets.length > 0) {
    // Primero, poner todos en gris
    datasets.forEach(dataset => {
      dataset.borderColor = '#c9cbcf'; // Gris para no resaltados
      dataset.borderWidth = 1;
      dataset.pointRadius = 0;
    });
    
    // El último dataset agregado (o el que quieras resaltar) en color
    if (datasets.length > 0) {
      const lastDataset = datasets[datasets.length - 1];
      lastDataset.borderColor = getColorForStation(lastDataset.key);
      lastDataset.borderWidth = 3;
      lastDataset.pointRadius = 3;
    }
  }
}

// Actualizar estado de botones
function updateMultiChartButtons(event, key, isRemoving) {
  if (event && event.target) {
    const btn = event.target;
    
    if (isRemoving) {
      btn.classList.remove('active', 'highlighted');
    } else {
      // Remover highlighted de todos los botones
      document.querySelectorAll('#multiStationSelector .selector-btn').forEach(b => {
        b.classList.remove('highlighted');
      });
      
      // Agregar clases al botón clickeado
      btn.classList.add('active');
      btn.classList.add('highlighted');
    }
  }
}

function loadSeaTempChart() {
  fetch('data/datos_temperatura.json')
    .then(res => res.json())
    .then(data => {
      const ctx = document.getElementById('seaTempChart');
      seaTempChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: data.dataset.map(d => d.dia),
          datasets: [
            { label: 'Temp Mar', data: data.dataset.map(d => d.temp_mar) },
            { label: 'Media Histórica', data: data.dataset.map(d => d.media_historica) }
          ]
        },
        options: { responsive: true }
      });
    });
}
