import express from "express";
import OpenAI from "openai";

const app = express();

// 🛠️ CONFIGURACIÓN INICIAL
app.use(express.json());
app.use(express.static("public"));

// 🎙️ FUNCIÓN MOTOR (La que hace que Alexa hable correctamente en Render)
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

// 🌐 RUTA DE CONTROL
app.get("/", (req, res) => res.send("🧿 Alexa Medium: Senda Activa"));

// 🔥 WEBHOOK PRINCIPAL (Lógica Jumanji Home)
app.post("/webhook", async (req, res) => {
  try {
    // 1️⃣ DETECTAR APERTURA (Cuando dices "Abre Senda Secreta")
    if (req.body.request?.type === "LaunchRequest") {
      return res.json(respuestaAlexa("Senda activada.")); 
    }

    // 2️⃣ CAPTURAR INPUT (Venga de Alexa o de Pipedream/Test)
    const input = req.body?.input || req.body?.request?.intent?.slots?.input?.value || "";
    const texto = input.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

    // 3️⃣ SISTEMA DE AHORRO: RESPUESTAS RÁPIDAS (Sin coste de OpenAI)
    const respuestasRapidas = [
      { regex: /\b(hola|buenas)\b/i, text: "Aquí estoy." },
      { regex: /gracias/i, text: "Sigue." },
      { regex: /(que hago hoy|no se que hacer|estoy perdido|estoy bloqueado)/i, text: "Empieza pequeño. Pero empieza." },
      { regex: /estoy cansado/i, text: "Entonces no avances. Sostente." }
    ];

    const matchRapido = respuestasRapidas.find(r => r.regex.test(texto));
    if (matchRapido) return res.json(respuestaAlexa(matchRapido.text));

    // 4️⃣ COMANDOS DE TABLERO (Los 7 recuperados de Pipedream)
    const comandosTablero = {
      "tension": { msg: "Aquí no.", acc: ["Apoya la mano en la mesa.", "Toca la pared.", "Aprieta el puño.", "Respira profundo."] },
      "interferencia": { msg: "No afectan.", acc: ["Sigue con lo que hacías.", "Pon los auriculares.", "Sube el volumen.", "Ignora todo."] },
      "ancla": { msg: "Toca superficie.", acc: ["Apoya la mano en la mesa.", "Toca la pared.", "Siente el contacto sólido."] },
      "cambio de foco": { msg: "Cambia de tarea.", acc: ["Deja lo que tienes en la mano.", "Coge otro objeto.", "Cambia de actividad."] },
      "bloqueo": { msg: "Muévete.", acc: ["Levántate ahora.", "Da tres pasos.", "Gira sobre ti misma.", "Coge un objeto."] },
      "reubicacion": { msg: "Cambia de zona.", acc: ["Ve al baño.", "Ve a la entrada.", "Sal al patio.", "Sube a la azotea."] },
      "cierre": { msg: "Ya está. Sigo.", acc: ["Continúa lo que hacías.", "Retoma ahora.", "Sigue sin pensar."] }
    };

    const cmdKey = Object.keys(comandosTablero).find(cmd => texto.includes(cmd));
    if (cmdKey) {
      const { msg, acc } = comandosTablero[cmdKey];
      const randomAcc = acc[Math.floor(Math.random() * acc.length)];
      return res.json(respuestaAlexa(`${msg} ${randomAcc}`));
    }

    // 5️⃣ FRASES DEL DÍA (Lógica temporal para que no se repita en 24h)
    const FRASES_JUMANJI = [
      "El tablero no pregunta si quieres jugar. Ya estás dentro.",
      "No avanzar… también cuenta como casilla.",
      "Cada paso ordena más que mil intenciones.",
      "Hoy no limpias. Hoy conquistas territorio.",
      "El desorden no es enemigo… es mapa sin leer.",
      "No necesitas ganas. Necesitas movimiento.",
      "Una acción rompe el hechizo.",
      "Empieza mal… pero empieza.",
      "No soy constante… soy persistente.",
      "No limpio… restauro equilibrio."
    ];
    
    if (texto === "hola" || texto === "frase") {
      const dia = Math.floor(new Date() / (1000 * 60 * 60 * 24));
      return res.json(respuestaAlexa(FRASES_JUMANJI[dia % FRASES_JUMANJI.length]));
    }

    // 6️⃣ LLAMADA AL GUARDIÁN (Solo si nada de lo anterior se activó)
    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        {
          role: "system",
          content: "Eres el Guardián de las Sendas. Hablas con tono misterioso, sabio y cercano, con ligera narrativa de explorador. Responde en 2 frases cortas, claro y natural para voz. Evita lenguaje excesivamente literario o recargado, evita sonar como un chatbot."
        },
        { role: "user", content: input }
      ]
    });

    // Limpieza de respuesta para Alexa (sin saltos de línea y longitud controlada)
    const respuestaGPT = completion.choices[0].message.content.replace(/\n/g, " ").trim().substring(0, 250);
    return res.json(respuestaAlexa(respuestaGPT));

  } catch (error) {
    console.error("ERROR SISTEMA:", error);
    return res.json(respuestaAlexa("El Guardián ha tenido un fallo interno..."));
  }
});

// 🚀 LANZAMIENTO
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Jumanji Home activo en puerto ${PORT}`));
