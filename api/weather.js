import fetch from "node-fetch";

export default async function handler(req, res) {
  const city = req.query.city || "Bishkek";

  try {
    const url = `https://wttr.in/${city}?format=j1`;
    const response = await fetch(url);
    const data = await response.json();

    // Простой JSON с нужными полями
    res.status(200).json({
      city: city,
      temperature: data.current_condition[0].temp_C,
      condition: data.current_condition[0].weatherDesc[0].value
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}