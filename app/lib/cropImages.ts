export const CROP_IMAGES: Record<string, string> = {
  Tomatoes: "https://upload.wikimedia.org/wikipedia/commons/8/89/Tomato_je.jpg",
  Potatoes: "https://upload.wikimedia.org/wikipedia/commons/a/ab/Patates.jpg",
  Onions: "https://upload.wikimedia.org/wikipedia/commons/a/a2/Mixed_onions.jpg",
  Carrots: "https://upload.wikimedia.org/wikipedia/commons/a/a2/Vegetable-Carrot-Bundle-wStalks.jpg",
  Spinach: "https://upload.wikimedia.org/wikipedia/commons/3/37/Spinacia_oleracea_Spinazie_bloeiend.jpg",
  Cabbage: "https://upload.wikimedia.org/wikipedia/commons/6/6f/Cabbage_and_cross_section_on_white.jpg",
  Cauliflower: "https://upload.wikimedia.org/wikipedia/commons/2/2f/Chou-fleur_02.jpg",
  Peas: "https://upload.wikimedia.org/wikipedia/commons/1/11/Peas_in_pods_-_Studio.jpg",
  Mangoes: "https://upload.wikimedia.org/wikipedia/commons/7/74/Mangos_-_single_and_halved.jpg",
  Apples: "https://upload.wikimedia.org/wikipedia/commons/a/a6/Pink_lady_and_cross_section.jpg",
  Bananas: "https://upload.wikimedia.org/wikipedia/commons/d/de/Bananavarieties.jpg",
  Grapes: "https://upload.wikimedia.org/wikipedia/commons/5/53/Grapes%2C_Rostov-on-Don%2C_Russia.jpg",
  Oranges: "https://upload.wikimedia.org/wikipedia/commons/e/e3/Oranges_-_whole-halved-segment.jpg",
  Rice: "https://upload.wikimedia.org/wikipedia/commons/0/0a/20201102.Hengnan.Hybrid_rice_Sanyou-1.6.jpg",
  Wheat: "https://upload.wikimedia.org/wikipedia/commons/a/a3/Vehn%C3%A4pelto_6.jpg",
  Corn: "https://upload.wikimedia.org/wikipedia/commons/e/e3/Zea_mays_-_K%C3%B6hler%E2%80%93s_Medizinal-Pflanzen-283.jpg",
  Garlic: "https://upload.wikimedia.org/wikipedia/commons/3/39/Allium_sativum_Woodwill_1793.jpg",
  Ginger: "https://upload.wikimedia.org/wikipedia/commons/1/18/Koeh-146-no_text.jpg",
  Turmeric: "https://upload.wikimedia.org/wikipedia/commons/a/ab/Turmeric_inflorescence.jpg",
  Sugarcane: "https://upload.wikimedia.org/wikipedia/commons/7/74/Saccharum_officinarum_-_K%C3%B6hler%E2%80%93s_Medizinal-Pflanzen-125.jpg",
  Milk: "https://upload.wikimedia.org/wikipedia/commons/0/0e/Milk_in_glass.jpg",
  Eggs: "https://upload.wikimedia.org/wikipedia/commons/5/5e/Chicken_eggs.jpg",
  Curd: "https://upload.wikimedia.org/wikipedia/commons/b/b5/Dahi_curd.jpg",
  Paneer: "https://upload.wikimedia.org/wikipedia/commons/e/e0/Paneer_cubes.jpg",
  Ghee: "https://upload.wikimedia.org/wikipedia/commons/0/0f/Ghee_in_a_bowl.jpg",
  Butter: "https://upload.wikimedia.org/wikipedia/commons/e/e4/Butter_on_a_plate.jpg",
};

export function getCropImage(cropName: string): string | null {
  return CROP_IMAGES[cropName] || null;
}
