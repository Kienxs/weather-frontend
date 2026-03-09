import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconUrl: markerIcon,
    iconRetinaUrl: markerIcon2x,
    shadowUrl: markerShadow,
});

import { useState, useEffect } from 'react';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import './App.css';

// IMPORT CHART LIBRARIES
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

// Register Chart.js
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

function MapUpdater({ lat, lon }) {
  const map = useMap();
  map.setView([lat, lon], 12);
  return null;
}

function App() {
  const [city, setCity] = useState('');
  const [weatherData, setWeatherData] = useState(null);
  const [forecastData, setForecastData] = useState(null); // State for forecast data
  const [error, setError] = useState('');
  const [sliderData, setSliderData] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState(null);

  const popularCities = ['Hanoi', 'Ho Chi Minh', 'Da Nang', 'Tokyo', 'Seoul', 'Paris', 'New York'];

  useEffect(() => {
    const fetchSliderData = async () => {
      try {
        const promises = popularCities.map(c => axios.get(`https://weather-in-the-world.onrender.com/api/weather?city=${c}`));
        const results = await Promise.all(promises);
        setSliderData(results.map(res => res.data));
      } catch (err) {}
    };
    fetchSliderData();
    searchCity('Hanoi');
  }, []);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setCity(value);
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }

    if (value.trim().length > 1) { 
      const timeout = setTimeout(async () => {
        try {
          const response = await axios.get(`https://weather-in-the-world.onrender.com/api/weather/search?query=${value}`);
          setSuggestions(response.data);
          setShowSuggestions(true);
        } catch (err) {
          console.error("Lỗi gợi ý tìm kiếm:", err);
        }
      }, 400); 
      
      setTypingTimeout(timeout);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSelectSuggestion = (suggestion) => {
    const searchString = `${suggestion.name}, ${suggestion.country}`;
    setCity(suggestion.name); 
    setShowSuggestions(false);
    searchCity(searchString); // Gửi tên kèm mã quốc gia xuống Backend
  };

  const searchCity = async (cityName) => {
    if (!cityName) return;
    try {
      setError('');
      setShowSuggestions(false);
      
      // FETCH 2 APIs IN PARALLEL: Current Weather and 5-Day Forecast
      const [weatherRes, forecastRes] = await Promise.all([
        axios.get(`https://weather-in-the-world.onrender.com/api/weather?city=${cityName}`),
        axios.get(`https://weather-in-the-world.onrender.com/api/weather/forecast?city=${cityName}`)
      ]);

      setWeatherData(weatherRes.data);

      // Filter forecast data: Get exact 12:00:00 PM for each day
      const dailyForecast = forecastRes.data.list.filter(item => item.dt_txt.includes("12:00:00"));
      setForecastData(dailyForecast);
      setCity(''); 
    } catch (err) {
      setError('City not found! Please try again.');
      setWeatherData(null);
      setForecastData(null);
    }
  };

  // Chart.js Configuration
  const chartData = {
    labels: forecastData?.map(item => {
      const date = new Date(item.dt_txt);
      return `${date.getDate()}/${date.getMonth() + 1}`; // Day/Month
    }),
    datasets: [
      {
        label: 'Temperature (°C)',
        data: forecastData?.map(item => item.main.temp),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.2)', // Gradient fill
        fill: true,
        tension: 0.4, // Smooth curves
        pointRadius: 6,
        pointBackgroundColor: '#fff',
        pointBorderColor: '#3b82f6',
        pointBorderWidth: 2,
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => `${context.parsed.y}°C`
        }
      }
    },
    scales: {
      y: { grid: { display: true, color: 'rgba(0,0,0,0.05)' } },
      x: { grid: { display: false } }
    }
  };

  return (
    <div className="container">
      <header>
        <h1>🌤️ Weather Around The World</h1>
        
        <div className="slider-container">
          <div className="slider-track">
            <div className="slide-group">
              {sliderData.map((data, index) => (
                <div key={`group1-${index}`} className="slide-card" onClick={() => searchCity(data.name)}>
                  <h4>{data.name}</h4>
                  <img src={`https://openweathermap.org/img/wn/${data.weather[0].icon}.png`} alt="icon" />
                  <p>{data.main.temp}°C</p>
                </div>
              ))}
            </div>
            <div className="slide-group">
              {sliderData.map((data, index) => (
                <div key={`group2-${index}`} className="slide-card" onClick={() => searchCity(data.name)}>
                  <h4>{data.name}</h4>
                  <img src={`https://openweathermap.org/img/wn/${data.weather[0].icon}.png`} alt="icon" />
                  <p>{data.main.temp}°C</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="search-wrapper">
          <div className="search-box">
            <input 
              type="text" 
              placeholder="Enter city name (e.g., Hanoi, Da Nang)..." 
              value={city}
              onChange={handleInputChange}
              onKeyDown={(e) => e.key === 'Enter' && searchCity(city)}
            />
            <button onClick={() => searchCity(city)}>🔍 Search</button>
          </div>

          {showSuggestions && suggestions.length > 0 && (
            <ul className="suggestions-list">
              {suggestions.map((item, index) => (
                <li key={index} onClick={() => handleSelectSuggestion(item)}>
                  📍 <strong>{item.name}</strong> 
                  <span style={{color: '#64748b', fontSize: '0.85em', marginLeft: '5px'}}>
                    {item.state ? `- ${item.state}, ` : '- '}{item.country}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </header>

      {error && <div className="error-msg">{error}</div>}

      {weatherData && (
        <main className="main-content">
          {/* ROW 1: CURRENT WEATHER (Left) & MAP (Right) */}
          <div className="top-row">
            <div className="weather-card">
              <div className="weather-header">
                <h2>{weatherData.name}</h2>
                <img src={`https://openweathermap.org/img/wn/${weatherData.weather[0].icon}@4x.png`} alt="weather icon" className="main-icon"/>
                <h1 className="main-temp">{weatherData.main.temp}°C</h1>
                <p className="description">{weatherData.weather[0].description}</p>
              </div>

              <div className="weather-details">
                <div className="detail-item"><span>🤔 Feels like</span><strong>{weatherData.main?.feels_like || weatherData.main.temp}°C</strong></div>
                <div className="detail-item"><span>💧 Humidity</span><strong>{weatherData.main.humidity}%</strong></div>
                <div className="detail-item"><span>💨 Wind Speed</span><strong>{weatherData.wind?.speed || 0} m/s</strong></div>
                <div className="detail-item"><span>🌡️ Pressure</span><strong>{weatherData.main.pressure} hPa</strong></div>
              </div>
            </div>

            <div className="map-wrapper">
              <MapContainer center={[weatherData.coord.lat, weatherData.coord.lon]} zoom={12} style={{ height: '100%', width: '100%' }}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <Marker position={[weatherData.coord.lat, weatherData.coord.lon]}>
                  <Popup>{weatherData.name}: {weatherData.main.temp}°C</Popup>
                </Marker>
                <MapUpdater lat={weatherData.coord.lat} lon={weatherData.coord.lon} />
              </MapContainer>
            </div>
          </div>

          {/* ROW 2: 5-DAY FORECAST CHART (Full width below) */}
          {forecastData && forecastData.length > 0 && (
            <div className="forecast-card">
              <h3>5-Day Forecast (12:00 PM)</h3>
              <div className="chart-container">
                <Line data={chartData} options={chartOptions} />
              </div>
              <div className="forecast-icons">
                {forecastData.map((item, idx) => (
                  <div key={idx} className="forecast-day">
                    <img src={`https://openweathermap.org/img/wn/${item.weather[0].icon}.png`} alt="icon"/>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      )}

      <footer className="footer">
        <p>© 2026 Copyright by <strong>FILO</strong>. Developed by Kienxs.</p>
        <p>Powered by OpenWeatherMap & OpenStreetMap.</p>
      </footer>
    </div>
  );
}

export default App;