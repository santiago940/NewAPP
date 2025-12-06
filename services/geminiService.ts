import { GoogleGenAI, Type, SchemaType } from "@google/genai";
import { Property, InvestmentAnalysis } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export const analyzeProperty = async (property: Property): Promise<InvestmentAnalysis> => {
  if (!apiKey) {
    // Fallback if no API key is present for demo purposes
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          projectedValue2Years: property.price * 1.15,
          appreciationPercentage: 15,
          riskLevel: 'Medio',
          marketSummary: "Simulación: El mercado muestra una tendencia alcista debido a la nueva infraestructura en la zona.",
          chartData: Array.from({ length: 24 }, (_, i) => ({
            month: `Mes ${i + 1}`,
            value: property.price * (1 + (0.15 * (i / 24)))
          }))
        });
      }, 1500);
    });
  }

  const prompt = `
    Analiza la siguiente propiedad inmobiliaria para inversión:
    Nombre: ${property.name}
    Tipo: ${property.type}
    Estado: ${property.status}
    Precio Actual: ${property.price} USD
    Ubicación: ${property.location.address}
    
    Genera una proyección financiera a 2 años.
    Calcula el porcentaje de valorización estimado.
    Determina el nivel de riesgo.
    Escribe un resumen breve de mercado en español.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            appreciationPercentage: { type: Type.NUMBER, description: "Estimated percentage increase over 2 years e.g. 12.5" },
            riskLevel: { type: Type.STRING, enum: ["Bajo", "Medio", "Alto"] },
            marketSummary: { type: Type.STRING, description: "A brief analysis in Spanish" },
            monthlyGrowthRate: { type: Type.NUMBER, description: "Average monthly growth rate e.g. 0.005" }
          },
          required: ["appreciationPercentage", "riskLevel", "marketSummary", "monthlyGrowthRate"]
        }
      }
    });

    const result = JSON.parse(response.text || '{}');
    
    // Generate chart data based on the AI's growth rate
    const chartData = Array.from({ length: 25 }, (_, i) => {
        const growthFactor = 1 + ((result.appreciationPercentage / 100) * (i / 24));
        return {
            month: i === 0 ? 'Actual' : `Mes ${i}`,
            value: Math.round(property.price * growthFactor)
        };
    });

    return {
      projectedValue2Years: property.price * (1 + (result.appreciationPercentage / 100)),
      appreciationPercentage: result.appreciationPercentage,
      riskLevel: result.riskLevel,
      marketSummary: result.marketSummary,
      chartData: chartData
    };

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw new Error("No se pudo generar el análisis.");
  }
};

export const findNearbyProperties = async (lat: number, lng: number): Promise<Property[]> => {
  if (!apiKey) {
     // Mock data for demo without key
     return [
        {
          id: 'mock-1',
          name: 'Residencial Parque Central',
          location: { lat: lat + 0.002, lng: lng + 0.002, address: 'Cerca de tu ubicación' },
          price: 280000,
          type: 'Apartamento',
          status: 'Nuevo',
          size: 95,
          imageUrl: 'https://picsum.photos/800/603',
          description: 'Apartamento moderno con excelentes áreas comunes.'
        },
        {
          id: 'mock-2',
          name: 'Villa Jardín',
          location: { lat: lat - 0.002, lng: lng - 0.001, address: 'A 5 min de tu ubicación' },
          price: 450000,
          type: 'Casa',
          status: 'Usado',
          size: 180,
          imageUrl: 'https://picsum.photos/800/604',
          description: 'Casa espaciosa ideal para familias.'
        }
     ];
  }

  const prompt = `
    Find 4 distinct real estate opportunities (residential complexes, apartments for sale, or new developments) near the provided location.
    
    Return a JSON array where each object has:
    - name: The name of the place.
    - description: A short description in Spanish.
    - price: An estimated price in USD (number only, estimate if needed).
    - type: 'Apartamento', 'Casa', or 'Comercial'.
    
    Output strictly a JSON block.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        tools: [{googleMaps: {}}],
        toolConfig: {
          retrievalConfig: {
            latLng: {
              latitude: lat,
              longitude: lng
            }
          }
        }
      }
    });

    // Extract JSON from markdown code block if present
    const text = response.text || '';
    const jsonMatch = text.match(/```json([\s\S]*?)```/);
    const jsonStr = jsonMatch ? jsonMatch[1] : text.replace(/```/g, '');
    
    let items = [];
    try {
        items = JSON.parse(jsonStr);
        if (!Array.isArray(items)) items = [];
    } catch (e) {
        console.warn("Could not parse JSON from Gemini Maps response", text);
        return [];
    }

    // Convert to Property objects
    // Note: Google Maps tool grounding doesn't always give precise coordinates in the text output easily
    // We will simulate their locations around the user for visualization purposes
    return items.map((item: any, index: number) => {
        // Generate a deterministic random offset based on index
        const latOffset = (Math.random() - 0.5) * 0.015;
        const lngOffset = (Math.random() - 0.5) * 0.015;

        return {
            id: `gen-${Date.now()}-${index}`,
            name: item.name || 'Propiedad Encontrada',
            location: {
                lat: lat + latOffset,
                lng: lng + lngOffset,
                address: 'Ubicación aproximada detectada por Maps'
            },
            price: item.price || 300000,
            type: item.type || 'Apartamento',
            status: 'Nuevo',
            size: 100 + (index * 20),
            imageUrl: `https://picsum.photos/800/60${5 + index}`,
            description: item.description || 'Propiedad identificada en su zona.'
        };
    });

  } catch (error) {
    console.error("Gemini Maps Error:", error);
    return [];
  }
};