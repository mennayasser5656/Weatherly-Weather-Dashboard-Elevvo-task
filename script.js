const weatherBox = document.getElementById("weather");
const forecastBox = document.getElementById("forecast");
const searchForm = document.getElementById("searchForm");
const searchBtn = document.getElementById("searchBtn");
const cityInput = document.getElementById("cityInput");
const messageBox = document.getElementById("message");

const WEATHER_CODES = {
  0: ["Clear sky", "☀️"], 1: ["Mainly clear", "🌤️"], 2: ["Partly cloudy", "⛅"], 3: ["Overcast", "☁️"],
  45: ["Fog", "🌫️"], 48: ["Depositing rime fog", "🌫️"], 51: ["Light drizzle", "🌦️"], 53: ["Moderate drizzle", "🌦️"], 55: ["Dense drizzle", "🌧️"],
  56: ["Light freezing drizzle", "🌧️"], 57: ["Dense freezing drizzle", "🌧️"], 61: ["Slight rain", "🌦️"], 63: ["Moderate rain", "🌧️"], 65: ["Heavy rain", "🌧️"],
  66: ["Light freezing rain", "🌧️"], 67: ["Heavy freezing rain", "🌧️"], 71: ["Slight snow", "🌨️"], 73: ["Moderate snow", "❄️"], 75: ["Heavy snow", "❄️"],
  77: ["Snow grains", "🌨️"], 80: ["Slight rain showers", "🌦️"], 81: ["Moderate rain showers", "🌧️"], 82: ["Violent rain showers", "⛈️"],
  85: ["Slight snow showers", "🌨️"], 86: ["Heavy snow showers", "❄️"], 95: ["Thunderstorm", "⛈️"], 96: ["Thunderstorm with hail", "⛈️"], 99: ["Heavy thunderstorm with hail", "⛈️"]
};

function getWeatherInfo(code) { return WEATHER_CODES[code] || ["Weather conditions", "🌤️"]; }
function showMessage(message, isError = false) {
  messageBox.textContent = message;
  messageBox.classList.toggle("error", isError);
}
function formatDay(dateString, options = { weekday: "short" }) {
  return new Intl.DateTimeFormat("en", options).format(new Date(`${dateString}T12:00:00`));
}
function formatDate(dateString) {
  return new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric" }).format(new Date(`${dateString}T12:00:00`));
}
async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Weather data could not be loaded. Please try again.");
  return response.json();
}
async function findCity(city) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;
  const data = await fetchJson(url);
  if (!data.results || data.results.length === 0) throw new Error("We couldn't find that city. Check the spelling and try again.");
  return data.results[0];
}
async function fetchWeather(latitude, longitude) {
  const params = new URLSearchParams({
    latitude, longitude,
    current: "temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m",
    daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max",
    timezone: "auto", forecast_days: "6"
  });
  return fetchJson(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);
}
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
}
function renderCurrentWeather(city, data) {
  const current = data.current;
  const [description, emoji] = getWeatherInfo(current.weather_code);
  const country = city.country ? `, ${city.country}` : "";
  weatherBox.innerHTML = `
    <article class="weather-card">
      <div class="weather-main">
        <div class="weather-heading"><div><p class="location-label">Current weather</p><h2>${escapeHtml(city.name)}${escapeHtml(country)}</h2><p class="local-date">${formatDate(data.daily.time[0])}</p></div></div>
        <div class="current-weather"><span class="weather-emoji" aria-hidden="true">${emoji}</span><div><div class="temperature">${Math.round(current.temperature_2m)}°</div><p class="weather-description">${description}</p><p class="feels-like">Feels like ${Math.round(current.apparent_temperature)}°C</p></div></div>
      </div>
      <div class="weather-details">
        <div class="detail-item"><span class="detail-label">Humidity</span><span class="detail-value">${current.relative_humidity_2m}%</span></div>
        <div class="detail-item"><span class="detail-label">Wind speed</span><span class="detail-value">${Math.round(current.wind_speed_10m)} km/h</span></div>
        <div class="detail-item"><span class="detail-label">Precipitation</span><span class="detail-value">${current.precipitation} mm</span></div>
      </div>
    </article>`;
}
function renderForecast(data) {
  const daily = data.daily;
  const days = daily.time.slice(1, 6);
  forecastBox.innerHTML = `<div class="forecast-section"><div class="section-heading"><div><h3>5-day forecast</h3><p>A quick look at the days ahead</p></div></div><div class="forecast-grid">${days.map((date, index) => {
    const i = index + 1;
    const [description, emoji] = getWeatherInfo(daily.weather_code[i]);
    const rainChance = daily.precipitation_probability_max[i];
    return `<article class="forecast-card"><p class="forecast-day">${formatDay(date)}</p><span class="forecast-emoji" aria-hidden="true">${emoji}</span><div class="forecast-temps"><span>${Math.round(daily.temperature_2m_max[i])}°</span><span class="forecast-low">${Math.round(daily.temperature_2m_min[i])}°</span></div><p class="forecast-desc">${description}</p><p class="forecast-desc">${rainChance == null ? "" : `Rain ${rainChance}%`}</p></article>`;
  }).join("")}</div></div>`;
}
async function loadCityWeather(cityName) {
  if (!cityName.trim()) { showMessage("Enter a city name to search.", true); return; }
  searchBtn.disabled = true;
  searchBtn.textContent = "Loading…";
  showMessage("Finding the latest forecast…");
  try {
    const city = await findCity(cityName.trim());
    const weather = await fetchWeather(city.latitude, city.longitude);
    renderCurrentWeather(city, weather);
    renderForecast(weather);
    cityInput.value = city.name;
    showMessage("");
  } catch (error) {
    showMessage(error.message || "Something went wrong. Please try again.", true);
  } finally {
    searchBtn.disabled = false;
    searchBtn.innerHTML = 'Search <span aria-hidden="true">→</span>';
  }
}
searchForm.addEventListener("submit", event => {
  event.preventDefault();
  loadCityWeather(cityInput.value);
});
async function loadWeatherFromLocation() {
  if (!navigator.geolocation) { cityInput.value = "Alexandria"; await loadCityWeather("Alexandria"); return; }
  navigator.geolocation.getCurrentPosition(async position => {
    try {
      const { latitude, longitude } = position.coords;
      const weather = await fetchWeather(latitude, longitude);
      let city = { name: "Your location", country: "" };
      try {
        const place = await fetchJson(`https://geocoding-api.open-meteo.com/v1/reverse?latitude=${latitude}&longitude=${longitude}&language=en&format=json`);
        if (place.results && place.results.length) city = place.results[0];
      } catch {}
      renderCurrentWeather(city, weather);
      renderForecast(weather);
      cityInput.value = city.name === "Your location" ? "" : city.name;
      showMessage("");
    } catch {
      cityInput.value = "Alexandria";
      await loadCityWeather("Alexandria");
    }
  }, async () => {
    cityInput.value = "Alexandria";
    await loadCityWeather("Alexandria");
  }, { timeout: 8000, maximumAge: 600000 });
}
window.addEventListener("DOMContentLoaded", loadWeatherFromLocation);
