import express from "express";
import OpenAI from "openai";

const app = express();
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
app.use(express.json());

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// 🧿 TEST
app.get("/", (req, res) => {
  res.send("🧿 Alexa Medium viva");
});

// 🔥 WEBHOOK (AQUÍ VIVE TODO TU SISTEMA)
app.post("/webhook", async (req, res) => {
  try {

    const input = req.body?.input || "";

    const texto = input
      ? input.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim()
      : "";

    // 🧠 APERTURA
    const esApertura = texto === "hola";

    // 🧠 SEÑAL
    const esSeñal = texto.includes("senal") 
              || texto.includes("orden")
              || texto.includes("ayuda")
              || texto.includes("peligro");

    // 🌿 FRASES DÍA
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

    // 🎴 MENSAJES SEÑAL
    const MENSAJES_SENAL = [
      "Reduce todo a una acción mínima.",
      "No elijas. Haz lo primero que veas.",
      "Una sola acción. Nada más."
    ];

    const mensaje = MENSAJES_SENAL[Math.floor(Math.random() * MENSAJES_SENAL.length)];

    if (esSeñal) {
      return res.json({ response: mensaje });
    }

    if (esApertura) {
      return res.json({ response: frase });
    }

    // 🧿 COMANDOS TABLERO
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

   /*sustitución de código por error al ejecutar alexa error de skill
      return res.json({
       response: `${data.mensaje} ${accion}`
      });*/
      return res.json({
  version: "1.0",
  response: {
    outputSpeech: {
      type: "SSML",
      ssml: `<speak>${data.mensaje} ${accion}</speak>`
    },
    shouldEndSession: false
  }
});
    }

    // 🧠 RESPUESTAS RÁPIDAS
    const respuestasRapidas = [
      { regex: /\b(hola|buenas)\b/i, text: "Aquí estoy." },
      { regex: /gracias/i, text: "Sigue." }
    ];

    const match = respuestasRapidas.find(r => r.regex.test(texto));

    if (match) {
      return res.json({ response: match.text });
    }

    // 🧠 OPENAI
    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: "Eres el Guardián de las Sendas. Hablas cercano, con ligera narrativa tipo explorador, sin exagerar."
        },
        {
          role: "user",
          content: input
        }
      ]
    });

    const respuesta = completion.choices[0].message.content.trim();

  //ELIMINADO PARA AÑADIR FORMATO ALEXA respuestaAlexa  return res.json({ response: respuesta });
    return res.json(respuestaAlexa("El Guardián permanece en silencio..."));
    
  } catch (error) {
    return res.json({ response: "El Guardián ha tenido un fallo interno..." });
  }
});

app.get("/webhook", async (req, res) => {
  try {

    // 👉 adaptamos input desde URL
    const input = req.query.input || "";

    // 👉 pegamos tu lógica tal cual
    const texto = input
      ? input.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim()
      : "";

    // 🧠 APERTURA
    const esApertura = texto === "hola";

    // 🧠 SEÑAL
    const esSeñal = texto.includes("senal") 
      || texto.includes("orden")
      || texto.includes("ayuda")
      || texto.includes("peligro");

    // 👉 prueba simple (NO TOCAMOS TU SISTEMA)
    if (texto.includes("bloqueo")) {
      return res.json({ response: "Muévete. Gira sobre ti misma." });
    }

    if (esApertura) {
      return res.json({ response: "El tablero responde..." });
    }

    if (esSeñal) {
      return res.json({ response: "Una sola acción. Nada más." });
    }

    return res.json({ response: "El Guardián escucha..." });

  } catch (error) {
    return res.json({ response: "Error en GET..." });
  }
});

// 🚀 SERVIDOR
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Servidor activo en puerto " + PORT);
});
