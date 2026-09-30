'use client'

import { useEffect, useState } from 'react'
import { format } from 'date-fns'

const WEATHER_LABELS: Record<number, string> = {
  0: 'Clear',
  1: 'Mainly Clear',
  2: 'Partly Cloudy',
  3: 'Cloudy',
  45: 'Fog',
  48: 'Fog',
  51: 'Light Drizzle',
  53: 'Drizzle',
  55: 'Heavy Drizzle',
  61: 'Light Rain',
  63: 'Rain',
  65: 'Heavy Rain',
  71: 'Light Snow',
  73: 'Snow',
  75: 'Heavy Snow',
  80: 'Rain Showers',
  81: 'Rain Showers',
  82: 'Violent Showers',
  85: 'Snow Showers',
  86: 'Snow Showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm',
  99: 'Thunderstorm',
}

function describe(code: number) {
  return WEATHER_LABELS[code] || 'Unknown'
}

export default function WeatherWidget() {
  const [weather, setWeather] = useState<any>(null)

  useEffect(() => {
          fetch('https://api.open-meteo.com/v1/forecast?latitude=40.894&longitude=-73.913&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&daily=temperature_2m_max,temperature_2m_min,weather_code,precipitation_probability_max&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=America%2FNew_York&forecast_days=5')
      .then((r) => r.json())
      .then((d) => setWeather(d))
      .catch(() => {})
  }, [])

if (!weather || !weather.current || !weather.daily) {
    return <p className="text-sm text-body">Loading weather…</p>
  }

  return (
    <>
      <p className="text-sm text-body">
        {Math.round(weather.current.temperature_2m)}°F · {describe(weather.current.weather_code)}
      </p>
      <p className="text-xs text-gray-400 mt-1">
        Humidity: {weather.current.relative_humidity_2m}% · Wind: {Math.round(weather.current.wind_speed_10m)} mph
      </p>

      <div className="grid grid-cols-5 gap-1 mt-3">
        {weather.daily.time.map((d: string, i: number) => (
          <div key={d} className="text-center text-xs bg-gray-50 rounded p-1">
            <p className="font-semibold">{format(new Date(d + 'T12:00:00'), 'EEE')}</p>
            <p className="text-gray-500">{describe(weather.daily.weather_code[i])}</p>
            <p>{Math.round(weather.daily.temperature_2m_max[i])}°/{Math.round(weather.daily.temperature_2m_min[i])}°</p>
            <p className="text-blue-500">{weather.daily.precipitation_probability_max[i]}%</p>
          </div>
        ))}
      </div>

      <div className="mt-3 rounded overflow-hidden border" style={{ height: 260 }}>
        <iframe
          title="Weather Radar Map"
                  src="https://embed.windy.com/embed2.html?lat=40.894&lon=-73.913&zoom=8&level=surface&overlay=radar&menu=&message=true&marker=true&calendar=now&type=map&location=coordinates&metricWind=default&metricTemp=default&radarRange=-1"
          width="100%"
          height="100%"
          style={{ border: 0 }}
        />
      </div>
    </>
  )
}
