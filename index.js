import express from "express";
import OpenAI from "openai";

const app = express();

app.use(express.json());
app.use(express.static("public"));

function respuestaAlexa(texto) {
  return {
    version: "1.0",
    response: {
      outputSpeech: {
        type: "SSML",
        ssml: `<speak>${texto}</speak>`
      },
      shouldEndSession: false
    }
  };
}

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

app.get("/", (req, res) => {
  res.send("🧿 Alexa Medium viva");
});

app.post("/webhook", async (req, res) => {
  try {
    if (req.body.request?.type === "LaunchRequest") {
      return res.json(respuestaAlexa("El Guardián está despierto."));
    }

    const input = req.body?.input 
      || req.body?.request?.intent?.slots?.input?.value 
      || "";
        
    console.log("BODY COMPLETO:", JSON.stringify(req.body, null, 2)); 
    
    const texto = input
      ? input.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim()
      : "";

    const esApertura = texto === "hola";

    const esSeñal = texto.includes("senal") 
              || texto.includes("orden")
              || texto.includes("ayuda")
              || texto.includes("peligro");

    const FRASES_DIA = [
      "El tablero no pregunta si quieres jugar. Ya estás dentro.",
      "No avanzar… también cuenta como casilla.",
      "Cada paso ordena más que mil intenciones.",
      "Hoy no limpias. Hoy conquistas territorio.",
      "El desorden no es enemigo… es mapa sin leer."
    ];

    const hoy = new Date();
    const inicioAño = new Date(hoy.getFullYear(), 0, 0);
    const diferencia = hoy - inicioAño;
    const unDia = 1000 * 60 * 60 * 24;
    const diaDelAño = Math.floor(diferencia / unDia);

    const frase = FRASES_DIA[diaDelAño % FRASES_DIA.length];

    const MENSAJES_SENAL = [
      "Reduce todo a una acción mínima.",
      "No elijas. Haz lo primero que veas.",
      "Una sola acción. Nada más."
    ];

    const mensaje = MENSAJES_SENAL[Math.floor(Math.random() * MENSAJES_SENAL.length)];

    if (esSeñal) {
      return res.json(respuestaAlexa(mensaje));
    }

    if (esApertura) {
      return res.json(respuestaAlexa(frase));
    }

    const comandosTablero = {
      "bloqueo": {
          mensaje: "Muévete.",
          acciones: [
            "Levántate ahora.",
            "Da tres pasos hacia adelante.",
            "Gira sobre ti misma."
          ]
      }
    };
    
    const comandoDetectado = Object.keys(comandosTablero).find(cmd =>
      texto.includes(cmd)
    );

    if (comandoDetectado) {
      const data = comandosTablero[comandoDetectado];
      const accion = data.acciones[Math.floor(Math.random() * data.acciones.length)];
      return res.json(respuestaAlexa(`${data.mensaje} ${accion}`));
    }

    const respuestasRapidas = [
      { regex: /\b(hola|buenas)\b/i, text: "Aquí estoy." },
      { regex: /gracias/i, text: "Sigue." }
    ];
    const match = respuestasRapidas.find(r => r.regex.test(texto));
    if (match) {
      return res.json(respuestaAlexa(match.text));
    }

    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: "Eres el Guardián de las Sendas. Hablas con tono misterioso, sabio y cercano, con ligera narrativa de explorador. Responde en 2 frases, claro y natural para voz. Evita lenguaje excesivamente literario o recargado, evita sonar como un chatbot."
        },
        {
          role: "user",
          content: input
        }
      ]
    });

    const respuesta = completion.choices[0].message.content.trim();
    return res.json(respuestaAlexa(respuesta));

  } catch (error) {
    console.error(error);
    return res.json(respuestaAlexa("El Guardián ha tenido un fallo interno..."));
  }
});

app.get("/webhook", async (req, res) => {
  try {
    const input = req.query.input || "";
    const texto = input
      ? input.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim()
      : "";

    if (texto.includes("bloqueo")) {
      return res.json({ response: "Muévete. Gira sobre ti misma." });
    }
    if (texto === "hola") {
      return res.json({ response: "El tablero responde..." });
    }
    if (texto.includes("senal") || texto.includes("orden") || texto.includes("ayuda")) {
      return res.json({ response: "Una sola acción. Nada más." });
    }
    return res.json({ response: "El Guardián escucha..." });
  } catch (error) {
    return res.json({ response: "Error en GET..." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Servidor activo en puerto " + PORT);
});
