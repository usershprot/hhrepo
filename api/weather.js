import fetch from "node-fetch";

export default async function handler(req, res) {
  const city = req.query.city;
  if (!city) return res.status(400).json({ error: "Укажите город" });

  try {
    // 1. Получаем координаты через Nominatim
    const nominatim = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&format=json&limit=1`);
    const loc = await nominatim.json();

    if (!loc || loc.length === 0) return res.status(404).json({ error: "Город не найден" });

    const lat = loc[0].lat;
    const lon = loc[0].lon;

    // 2. Получаем погоду через Open-Meteo
    const weatherResp = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
    const weatherData = await weatherResp.json();

    res.status(200).json({
      city: loc[0].display_name,
      temperature: Math.round(weatherData.current_weather.temperature),
      windspeed: weatherData.current_weather.windspeed,
      weathercode: weatherData.current_weather.weathercode
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}