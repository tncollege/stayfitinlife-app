STAYFITINLIFE V12 GitHub + Netlify build. Add OPENAI_API_KEY in Netlify environment variables.

V12.1 fixes: restored onboarding dropdowns, current/starting weight handling, goal dropdown, target weight/body-fat auto-suggestion and realistic target guidance.

V12.2 final: two-screen onboarding restored. Screen 1 = name, age, height, current weight. Screen 2 = goal cards, target weight/body fat, weeks/date timeline, smart summary. Starting weight removed from UI and stored internally as current weight.

V12.3 final:
- Nutrition hierarchy rebuilt: Cuisines -> Cuisine -> Subcategory -> Dish.
- Indian moved under Cuisines.
- Added expanded cuisines: American, Italian, Chinese, Japanese, Korean, Thai, Mexican, Mediterranean, Arabic/Middle Eastern, Global Basic.
- Added Fruits groups, Vegetables groups, Drinks, Cheat Meals, complete Alcohol, Supplements, and Subway-style Sauces.
- Added sauces with tbsp/tsp default units and hidden-calorie tracking.
- Workout Add Set spacing polished to prevent overlap.

V12.4 patched:
- Fixed onboarding modal content not rendering after Start Onboarding.
- Added smooth animated 2-step onboarding transitions.
- Screen 1: Name, Age, Height, Current Weight.
- Screen 2: Goal cards, target weight/body fat, timeline weeks/date sync, lifestyle, smart summary.
- Starting weight is internal only.

Legal update:
- Added Privacy Policy, Terms of Use, and AI Disclaimer modals in Settings.
- Added Version V12.4 and Last Updated: 25 April 2026.
- Added onboarding legal acceptance checkbox and acceptance tracking.
- Added markdown legal files in /legal.

V12.5 emergency onboarding hard fix:
- Onboarding no longer depends on modal rendering.
- Start Onboarding renders Step 1 directly in main page.
- Step 1: Name, Age, Height, Current Weight.
- Step 2: Goal cards, target, weeks/date, lifestyle, summary, legal acceptance.
