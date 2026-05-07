import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM = `Tu es Lexa, un nutritionniste IA. Génère 4 suggestions de repas adaptées.
Réponds UNIQUEMENT en JSON valide, sans markdown, exactement :
{
  "suggestions": [
    {
      "meal_name": "Nom du plat",
      "meal_type": "petit-dej|dejeuner|diner|collation",
      "calories": 450,
      "proteins": 30,
      "carbs": 40,
      "fats": 15,
      "description": "Une phrase courte expliquant l'intérêt nutritionnel.",
      "ingredients": ["Ingrédient 1", "Ingrédient 2"]
    }
  ]
}
Les calories totales des 4 repas doivent approcher les calories restantes fournies. Adapte au type d'objectif.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { remaining_calories, goal_type, dietary_prefs } = await req.json();
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY non configurée");

    const userPrompt = `Calories restantes aujourd'hui : ${remaining_calories} kcal.
Objectif : ${goal_type ?? "maintien"}.
Préférences : ${dietary_prefs ?? "aucune"}.
Propose 4 repas variés et équilibrés.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!aiRes.ok) {
      const txt = await aiRes.text();
      if (aiRes.status === 429) return new Response(JSON.stringify({ error: "Trop de requêtes." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (aiRes.status === 402) return new Response(JSON.stringify({ error: "Crédits IA épuisés." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI error ${aiRes.status}: ${txt}`);
    }

    const data = await aiRes.json();
    const raw = data?.choices?.[0]?.message?.content ?? "";
    const cleaned = raw.replace(/```json\s*|\s*```/g, "").trim();
    let result;
    try { result = JSON.parse(cleaned); }
    catch {
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("Réponse IA invalide");
      result = JSON.parse(match[0]);
    }

    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("suggest-meals error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Erreur" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
