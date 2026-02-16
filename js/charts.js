
let comboChart, multiLineChart, seaTempChart;
let precipData;

function loadPrecipitationCharts() {
  fetch('data/datos_precipitacion.json')
    .then(res => {
      if (!res.ok) throw new Error('Error cargando precipitación');
      return res.json();
    })
    .then(data => {
      precipData = data;
      initComboChart(data);
      initMultiChart(data);
      createStationButtons(data.estaciones);
    })
    .catch(err => {
      console.error('Error cargando gráficas:', err);
      document.getElementById('stationSelector').innerHTML = 
        '<p style="color: #ef4444; font-size: 12px;">Error cargando datos de estaciones</p>';
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

  const firstKey = Object.keys(stations)[0];
  console.log(firstKey)
  if (firstKey) updateComboChart(firstKey);
}

function initComboChart(data) {
  const ctx = document.getElementById('comboChart');
  
  if (comboChart) {
    comboChart.destroy();
  }
  
  comboChart = new Chart(ctx, {
    type: 'bar',
    data: { 
      labels: data.config.labels, 
      datasets: [
        {
          type: 'line',
          label: 'Intensidad',
          data: [],
          borderColor: '#36a2eb',
          backgroundColor: 'transparent',
          borderWidth: 2,
          tension: 0.3,
          pointRadius: 3,
          pointBackgroundColor: '#36a2eb',
          yAxisID: 'y'
        },
        {
          type: 'line',
          label: 'Acumulado',
          data: [],
          yAxisID: 'y1',
          borderColor: '#ff6384',
          backgroundColor: 'rgba(255, 99, 132, 0.3)',
          borderWidth: 0,
          pointRadius: 0,
          tension: 0.3,
          fill: 'origin'
        }
      ] 
    },
    animation: {
      duration: 800,
      easing: 'easeOutQuart'
    },
    options: { 
      responsive: true,
      maintainAspectRatio: false,
      resizeDelay: 100,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        title: {
          display: false
        },
        legend: {
          position: 'top',
          align: 'end',
          labels: {
            boxWidth: 12,
            boxHeight: 12,
            padding: 10,
            font: {
              size: 11,
              family: 'system-ui'
            },
            usePointStyle: true,
            pointStyle: 'rectRounded'
          }
        },
        tooltip: {
          mode: 'index',
          intersect: false,
          titleFont: { size: 12 },
          bodyFont: { size: 11 }
        }
      },
      scales: {
        x: {
          ticks: {
            maxRotation: 45,
            minRotation: 45,
            autoSkip: true,
            maxTicksLimit: 8,
            font: { size: 10 }
          },
          grid: {
            display: false
          }
        },
        y: {
          type: 'linear',
          position: 'left',
          title: {
            display: true,
            text: 'Intensidad (mm/h)',
            font: { size: 10, weight: 'bold' },
            color: '#36a2eb'
          },
          ticks: { font: { size: 10 } },
          grid: { color: 'rgba(0,0,0,0.05)' },
          beginAtZero: true,
          max: 200
        },
        y1: {
          type: 'linear',
          position: 'right',
          title: {
            display: true,
            text: 'Acumulado (mm)',
            font: { size: 10, weight: 'bold' },
            color: '#ff6384'
          },
          ticks: { font: { size: 10 } },
          grid: { drawOnChartArea: false },
          beginAtZero: true,
          max: 800
        }
      }
    }
  });
  
  // Añadir fuente debajo del gráfico
  addChartSource('comboChart', 'AEMET / AVAMET / CHJ');
}

function updateComboChart(stationKey) {
  const st = precipData.estaciones[stationKey];
  
  document.querySelectorAll('#stationSelector .selector-btn').forEach(btn => {
    btn.classList.remove('active');
    if (btn.textContent === st.label) {
      btn.classList.add('active');
    }
  });
  
  comboChart.data.datasets[0].data = st.intensidad;
  comboChart.data.datasets[1].data = st.acumulado;
  
  comboChart.update();
}

function initMultiChart(data) {
  const ctx = document.getElementById('multiLineChart');
  
  if (multiLineChart) {
    multiLineChart.destroy();
  }
  
  multiLineChart = new Chart(ctx, {
    type: 'line',
    data: { 
      labels: data.config.labels, 
      datasets: [] 
    },
    options: { 
      responsive: true,
      maintainAspectRatio: false,
      resizeDelay: 100,
      plugins: {
        title: {
          display: false
        },
        legend: {
          display: true,
          position: 'top',
          align: 'center',
          labels: {
            boxWidth: 10,
            boxHeight: 10,
            padding: 8,
            font: { size: 10 },
            usePointStyle: true,
            pointStyle: 'circle'
          }
        },
        tooltip: {
          mode: 'index',
          intersect: false
        }
      },
      scales: {
        x: {
          ticks: {
            maxRotation: 0,
            autoSkip: true,
            maxTicksLimit: 6,
            font: { size: 10 }
          },
          grid: { display: false }
        },
        y: {
          title: {
            display: true,
            text: 'Intensidad (mm/h)',
            font: { size: 10, weight: 'bold' }
          },
          ticks: { font: { size: 10 } },
          grid: { color: 'rgba(0,0,0,0.05)' },
          beginAtZero: true
        }
      },
      elements: {
        line: {
          tension: 0.3,
          borderWidth: 2
        },
        point: {
          radius: 2,
          hoverRadius: 4
        }
      }
    }
  });

  const container = document.getElementById("multiStationSelector");
  container.innerHTML = '';

  let first = true;

  Object.entries(data.estaciones).forEach(([key, st]) => {
    const color = getColorForStation(key);
    
    const checkboxContainer = document.createElement("div");
    checkboxContainer.className = "checkbox-container";
    
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.id = `station-${key}`;
    checkbox.dataset.key = key;
    checkbox.dataset.label = st.label;
    checkbox.onchange = (e) => toggleStationLine(key, st, e);
    
    const label = document.createElement("label");
    label.htmlFor = `station-${key}`;
    
    const colorMarker = document.createElement("span");
    colorMarker.className = "color-marker";
    colorMarker.style.width = "12px";
    colorMarker.style.height = "12px";
    colorMarker.style.backgroundColor = color;
    colorMarker.style.borderRadius = "2px";
    colorMarker.style.marginRight = "6px";
    colorMarker.style.display = "inline-block";
    colorMarker.style.border = "1px solid rgba(255, 255, 255, 0.3)";
    
    const labelText = document.createTextNode(st.label);
    
    label.appendChild(colorMarker);
    label.appendChild(labelText);
    
    checkboxContainer.appendChild(checkbox);
    checkboxContainer.appendChild(label);
    container.appendChild(checkboxContainer);
    if (first) {
      checkbox.checked = true;
      first = false;
      toggleStationLine(key, st, { target: checkbox });
    }
  });
  
  // Añadir fuente debajo del gráfico
  addChartSource('multiLineChart', 'AEMET / AVAMET / CHJ');
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
      backgroundColor: color + '20',
      borderWidth: 2,
      tension: 0.3,
      fill: false,
      pointRadius: 2,
      pointBackgroundColor: color,
      pointBorderColor: '#0f172a',
      pointBorderWidth: 1
    };
    
    multiLineChart.data.datasets.push(newDataset);
  }
  
  const label = checkbox.nextElementSibling;
  if (label) {
    if (isChecked) {
      label.style.backgroundColor = 'rgba(30, 41, 59, 0.8)';
      label.style.borderColor = getColorForStation(key);
      label.style.color = '#f1f5f9';
      label.style.fontWeight = '500';
    } else {
      label.style.backgroundColor = 'rgba(15, 23, 42, 0.8)';
      label.style.borderColor = 'rgba(255, 255, 255, 0.15)';
      label.style.color = '#e2e8f0';
      label.style.fontWeight = 'normal';
    }
  }
  
  if (multiLineChart.data.datasets.length === 0) {
    multiLineChart.options.plugins.title = {
      display: true,
      text: 'Selecciona al menos una estación',
      color: '#94a3b8',
      font: { size: 12 }
    };
  } else {
    multiLineChart.options.plugins.title = { display: false };
  }
  
  multiLineChart.update();
}

function getColorForStation(key) {
  const colors = [
    '#60a5fa',
    '#f87171',
    '#fbbf24',
    '#34d399',
    '#a78bfa',
    '#f472b6',
    '#2dd4bf',
    '#fb923c',
    '#818cf8',
    '#f59e0b',
    '#10b981',
    '#8b5cf6',
    '#ef4444',
    '#3b82f6',
    '#ec4899'
  ];
  
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = key.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const index = Math.abs(hash) % colors.length;
  return colors[index];
}

function loadSeaTempChart() {
  fetch('data/datos_temperatura.json')
    .then(res => res.json())
    .then(data => {
      const ctx = document.getElementById('seaTempChart');
      
      if (seaTempChart) {
        seaTempChart.destroy();
      }
      
      seaTempChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: data.dataset.map(d => {
            const date = new Date(d.dia);
            return `${date.getDate()}/${date.getMonth() + 1}`;
          }),
          datasets: [
            { 
              label: 'Temp Mar',
              data: data.dataset.map(d => d.temp_mar),
              borderColor: '#36a2eb',
              backgroundColor: 'rgba(54, 162, 235, 0.1)',
              borderWidth: 2,
              tension: 0.4,
              pointRadius: 3,
              pointBackgroundColor: '#36a2eb'
            },
            { 
              label: 'Media Histórica',
              data: data.dataset.map(d => d.media_historica),
              borderColor: '#ff6384',
              backgroundColor: 'rgba(255, 99, 132, 0.1)',
              borderWidth: 2,
              borderDash: [5, 5],
              tension: 0.4,
              pointRadius: 3,
              pointBackgroundColor: '#ff6384'
            }
          ]
        },
        options: { 
          responsive: true,
          maintainAspectRatio: false,
          resizeDelay: 100,
          plugins: {
            title: {
              display: false
            },
            legend: {
              position: 'top',
              align: 'end',
              labels: {
                boxWidth: 12,
                boxHeight: 12,
                padding: 10,
                font: { size: 11 },
                usePointStyle: true
              }
            }
          },
          scales: {
            x: {
              ticks: {
                maxRotation: 45,
                minRotation: 45,
                autoSkip: true,
                maxTicksLimit: 8,
                font: { size: 10 }
              },
              grid: { display: false }
            },
            y: {
              title: {
                display: true,
                text: 'Temperatura (°C)',
                font: { size: 10, weight: 'bold' }
              },
              ticks: { font: { size: 10 } },
              grid: { color: 'rgba(0,0,0,0.05)' }
            }
          }
        }
      });
      
      // Añadir fuente debajo del gráfico
      addChartSource('seaTempChart', 'CEAM, AEMET y Copernicus Marine Service');
    })
    .catch(err => {
      console.error('Error cargando temperatura:', err);
      document.getElementById('seaTempChart').style.display = 'none';
      document.querySelector('.chart-slide:has(#seaTempChart) .text-block').innerHTML += 
        '<p style="color: #ef4444; font-size: 12px;">Error cargando datos</p>';
    });
}

// Función auxiliar para añadir fuente debajo del gráfico
function addChartSource(canvasId, chartName) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  
  // Buscar contenedor padre
  const container = canvas.closest('.chart-container') || canvas.parentElement;
  if (!container) return;
  
  // Eliminar fuente anterior si existe
  const existingSource = container.querySelector('.chart-source');
  if (existingSource) {
    existingSource.remove();
  }
  
  // Crear elemento de fuente
  const sourceDiv = document.createElement('div');
  sourceDiv.className = 'chart-source';
  sourceDiv.textContent = `Fuente: ${chartName}`;
  
  // Insertar después del canvas
  canvas.insertAdjacentElement('afterend', sourceDiv);
}