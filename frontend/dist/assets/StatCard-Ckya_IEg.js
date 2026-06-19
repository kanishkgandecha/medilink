import{c,u as m,j as e}from"./index-SGtv6yCJ.js";import{T as u}from"./trending-up-D7AzenIa.js";/**
 * @license lucide-react v0.294.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const p=c("TrendingDown",[["polyline",{points:"22 17 13.5 8.5 8.5 13.5 2 7",key:"1r2t7k"}],["polyline",{points:"16 17 22 17 22 11",key:"11uiuu"}]]),g=({title:l,value:n,change:a,icon:o,trend:i,iconBg:r="bg-blue-50 text-[#2E86DE]",onClick:t})=>{const{darkMode:s}=m(),d=i==="up",x=r.includes("teal")?"#0d9488":r.includes("emerald")?"#10b981":r.includes("orange")?"#f97316":r.includes("violet")?"#7c3aed":r.includes("red")?"#ef4444":r.includes("amber")?"#f59e0b":r.includes("purple")?"#9333ea":"#2E86DE";return e.jsxs("div",{onClick:t,className:`
        rounded-xl p-5 border transition-all duration-200 overflow-hidden relative
        ${t?"cursor-pointer select-none":""}
        ${s?`bg-gray-800 border-gray-700/60 hover:border-gray-600 hover:shadow-md ${t?"hover:bg-gray-750":""}`:`bg-white border-gray-100 shadow-[0_1px_4px_rgba(0,0,0,0.06)] hover:border-gray-200 hover:shadow-md ${t?"active:scale-[0.98]":""}`}
      `,children:[e.jsx("div",{className:"absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl",style:{background:x}}),e.jsxs("div",{className:"flex items-center justify-between mb-3",children:[e.jsx("p",{className:`text-xs font-medium uppercase tracking-wider
          ${s?"text-gray-500":"text-gray-400"}`,children:l}),e.jsx("div",{className:`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0
          ${s?"bg-gray-700":r}`,children:e.jsx(o,{className:"w-5 h-5",strokeWidth:2})})]}),e.jsx("p",{className:`text-3xl font-bold tabular-nums leading-tight
        ${s?"text-white":"text-gray-900"}`,children:n}),a&&e.jsxs("div",{className:"flex items-center mt-2 gap-1.5",children:[e.jsxs("span",{className:`flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-full
            ${d?"bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400":"bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400"}`,children:[d?e.jsx(u,{className:"w-3 h-3"}):e.jsx(p,{className:"w-3 h-3"}),a]}),e.jsx("span",{className:`text-xs ${s?"text-gray-600":"text-gray-400"}`,children:"vs last month"})]})]})};export{g as S,p as T};
