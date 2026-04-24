export const save=(key,data)=>localStorage.setItem(key,JSON.stringify(data));
export const load=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key)||JSON.stringify(fallback))}catch{return fallback}};
