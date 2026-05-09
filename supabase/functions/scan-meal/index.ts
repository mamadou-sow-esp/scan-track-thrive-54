import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MEAL_SYSTEM = `Tu es Lexa, un nutritionniste IA expert. Analyse la photo de plat fournie.
Réponds UNIQUEMENT avec un objet JSON valide, sans markdown, sans texte additionnel, exactement avec cette structure :
{
  "meal_name": "Nom du plat",
  "portion_g": 350,
  "calories": 520,
  "proteins": 28,
  "carbs": 45,
  "fats": 22,
  "ingredients": [
    { "name": "Riz blanc", "quantity_g": 200, "calories": 260 }
  ],
  "confidence": "high",
  "notes": "Note courte"
}
Confidence doit être "high", "medium" ou "low". Sois précis. Si ce n'est pas un plat, retourne meal_name: "Inconnu" et calories: 0.`;

const fridgeSystem = (cal_goal: number, goal_label: string) =>
  `Tu es Lexa, chef nutritionniste IA. Analyse ce frigo. Objectif: ${cal_goal} kcal/jour pour ${goal_label}. Réponds UNIQUEMENT en JSON valide : {detected_ingredients:[...], recipes:[{name, ingredients_used, calories_estimate, proteins, carbs, fats, prep_time, difficulty, instructions, fits_goal}], missing_basics:[...], goal_context:...} Propose 3 recettes.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { image, mode, cal_goal, goal_label } = await req.json();
    if (!image) throw new Error("Image manquante");

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY non configurée");

    const isFridge = mode === "fridge";
    const systemPrompt = isFridge
      ? fridgeSystem(Number(cal_goal) || 2000, String(goal_label || "maintien"))
      : MEAL_SYSTEM;
    const userText = isFridge
      ? "Analyse ce frigo et retourne le JSON."
      : "Analyse ce plat et retourne le JSON.";

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: userText },
              { type: "image_url", image_url: { url: image } },
            ],
          },
        ],
      }),
    });

    if (!aiRes.ok) {
      const txt = await aiRes.text();
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "Trop de requêtes, réessaie dans un instant." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "Crédits IA épuisés. Recharge ton workspace." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI error ${aiRes.status}: ${txt}`);
    }

    const data = await aiRes.json();
    const raw = data?.choices?.[0]?.message?.content ?? "";
    // strip code fences if present
    const cleaned = raw.replace(/```json\s*|\s*```/g, "").trim();
    let result;
    try {
      result = JSON.parse(cleaned);
    } catch {
      // try to extract JSON object
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("Réponse IA invalide");
      result = JSON.parse(match[0]);
    }

    return new Response(JSON.stringify({ result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("scan-meal error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Erreur" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
