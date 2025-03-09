// Initialize chart with custom styling
const ctx = document.getElementById("weatherChart").getContext("2d");
Chart.defaults.color = "rgba(255, 255, 255, 0.7)";
Chart.defaults.font.family = "'Poppins', sans-serif";

const weatherChart = new Chart(ctx, {
  type: "line",
  data: {
    labels: [],
    datasets: [
      {
        label: "Temperature (°C)",
        borderColor: "#ff7e5f",
        backgroundColor: "rgba(255, 126, 95, 0.2)",
        borderWidth: 3,
        pointBackgroundColor: "#ff7e5f",
        pointBorderColor: "rgba(255, 255, 255, 0.8)",
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        tension: 0.4,
        data: [],
        yAxisID: "y",
      },
      {
        label: "Humidity (%)",
        borderColor: "#00f2fe",
        backgroundColor: "rgba(0, 242, 254, 0.2)",
        borderWidth: 3,
        pointBackgroundColor: "#00f2fe",
        pointBorderColor: "rgba(255, 255, 255, 0.8)",
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        tension: 0.4,
        data: [],
        yAxisID: "y1",
      },
    ],
  },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
        labels: {
          padding: 20,
          usePointStyle: true,
          pointStyle: "circle",
          font: {
            size: 12,
          },
        },
      },
      tooltip: {
        backgroundColor: "rgba(0, 0, 0, 0.7)",
        titleFont: {
          size: 13,
        },
        bodyFont: {
          size: 13,
        },
        padding: 10,
        cornerRadius: 8,
        displayColors: true,
      },
    },
    scales: {
      x: {
        grid: {
          color: "rgba(255, 255, 255, 0.1)",
          borderColor: "rgba(255, 255, 255, 0.2)",
        },
        ticks: {
          font: {
            size: 11,
          },
        },
        title: {
          display: true,
          text: "Time",
          font: {
            size: 13,
          },
        },
      },
      y: {
        type: "linear",
        display: true,
        position: "left",
        title: {
          display: true,
          text: "Temperature (°C)",
          font: {
            size: 13,
          },
        },
        grid: {
          color: "rgba(255, 255, 255, 0.1)",
          borderColor: "rgba(255, 255, 255, 0.2)",
        },
        min: 0,
        max: 50,
      },
      y1: {
        type: "linear",
        display: true,
        position: "right",
        title: {
          display: true,
          text: "Humidity (%)",
          font: {
            size: 13,
          },
        },
        min: 0,
        max: 100,
        grid: {
          drawOnChartArea: false,
          borderColor: "rgba(255, 255, 255, 0.2)",
        },
      },
    },
    animations: {
      tension: {
        duration: 1000,
        easing: "linear",
      },
    },
  },
});

// Rolling window settings (e.g., show last 30 minutes of data)
const MAX_DATA_POINTS = 180; // Approx 30 minutes if data comes every 10 seconds
let temperatureData = [];
let humidityData = [];
let labels = [];

// Function to update chart in real-time
function updateChartRealTime(timestamp, temperature, humidity) {
  const timeLabel = new Date(timestamp).toLocaleTimeString();

  // Add new data
  labels.push(timeLabel);
  temperatureData.push(temperature);
  humidityData.push(humidity);

  // Remove old data if exceeding max points
  if (labels.length > MAX_DATA_POINTS) {
    labels.shift();
    temperatureData.shift();
    humidityData.shift();
  }

  // Update chart data
  weatherChart.data.labels = labels;
  weatherChart.data.datasets[0].data = temperatureData;
  weatherChart.data.datasets[1].data = humidityData;

  // Update last update time
  document.getElementById("last-update").innerText = timeLabel;

  // Smooth chart update
  weatherChart.update("none"); // 'none' for no animation on every update
}

// Function to fetch current readings
async function fetchCurrentReadings() {
  try {
    const response = await axios.get("/api/weather/current");
    const data = response.data;
    if (data) {
      if (data.temperature !== null) {
        document.getElementById("temp").innerText = data.temperature.toFixed(1);
      }
      if (data.humidity !== null) {
        document.getElementById("humidity").innerText =
          data.humidity.toFixed(1);
      }
    }
  } catch (error) {
    console.error("Error fetching current readings:", error);
  }
}

// Function to update historical averages
async function updateHistoricalAverages() {
  try {
    const response = await axios.get("/api/weather/history");
    const data = response.data;

    if (data && data.length > 0) {
      // Process temperature data
      const tempData = data.filter((reading) => reading.type === "temperature");
      const tempValues = tempData.map((reading) => reading.value);
      const tempAvg = tempValues.reduce((a, b) => a + b, 0) / tempValues.length;

      // Process humidity data
      const humidityData = data.filter(
        (reading) => reading.type === "humidity"
      );
      const humidityValues = humidityData.map((reading) => reading.value);
      const humidityAvg =
        humidityValues.reduce((a, b) => a + b, 0) / humidityValues.length;

      // Update averages display
      if (!isNaN(tempAvg)) {
        document.getElementById("temp-avg").innerText = tempAvg.toFixed(1);
      }
      if (!isNaN(humidityAvg)) {
        document.getElementById("humidity-avg").innerText =
          humidityAvg.toFixed(1);
      }

      // Update chart
      updateChart(data);
    }
  } catch (error) {
    console.error("Error fetching historical data:", error);
  }
}

// Function to update the chart with new data
function updateChart(data) {
  const tempData = data
    .filter((reading) => reading.type === "temperature")
    .map((reading) => ({
      x: new Date(reading.timestamp),
      y: reading.value,
    }));

  const humidityData = data
    .filter((reading) => reading.type === "humidity")
    .map((reading) => ({
      x: new Date(reading.timestamp),
      y: reading.value,
    }));

  weatherChart.data.labels = tempData.map((reading) =>
    reading.x.toLocaleTimeString()
  );
  weatherChart.data.datasets[0].data = tempData;
  weatherChart.data.datasets[1].data = humidityData;
  weatherChart.update();
}

// Connect to the MQTT Broker over WebSockets
const mqttClient = mqtt.connect("ws://157.173.101.159:9001");

mqttClient.on("connect", () => {
  console.log("Connected to MQTT via WebSockets");
  mqttClient.subscribe("/work_group_01/room_temp/temperature");
  mqttClient.subscribe("/work_group_01/room_temp/humidity");
});

mqttClient.on("message", (topic, message) => {
  console.log(`Received: ${topic} → ${message.toString()}`);
  const value = parseFloat(message.toString());
  const timestamp = new Date().toISOString();

  if (topic === "/work_group_01/room_temp/temperature") {
    const tempElement = document.getElementById("temp");
    const currentTemp = parseFloat(tempElement.innerText) || 0;
    tempElement.innerText = value.toFixed(1);

    // Store temperature reading
    axios
      .post("/api/weather/history", {
        type: "temperature",
        value: value,
        timestamp: timestamp,
      })
      .catch((error) => console.error("Error storing temperature:", error));
  } else if (topic === "/work_group_01/room_temp/humidity") {
    const humidityElement = document.getElementById("humidity");
    const currentHumidity = parseFloat(humidityElement.innerText) || 0;
    humidityElement.innerText = value.toFixed(1);

    // Store humidity reading
    axios
      .post("/api/weather/history", {
        type: "humidity",
        value: value,
        timestamp: timestamp,
      })
      .catch((error) => console.error("Error storing humidity:", error));
  }
});

// Initial fetch and setup intervals
fetchCurrentReadings();
updateHistoricalAverages();
setInterval(fetchCurrentReadings, 30000); // Update every 30 seconds
setInterval(updateHistoricalAverages, 60000); // Update every minute
