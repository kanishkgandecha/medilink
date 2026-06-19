import{c as f,u as g,j as a}from"./index-SGtv6yCJ.js";import{C as y}from"./chevron-right-CGjTpZhc.js";/**
 * @license lucide-react v0.294.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const b=f("ChevronLeft",[["path",{d:"m15 18-6-6 6-6",key:"1wnfg3"}]]),i=12,j=(n,t)=>{const r=(t-1)*i;return n.slice(r,r+i)},_=({total:n,page:t,onPage:r})=>{const{darkMode:c}=g(),s=Math.ceil(n/i);if(s<=1)return null;const h=(()=>{if(s<=5)return Array.from({length:s},(m,o)=>o+1);const e=Math.max(1,Math.min(t-2,s-4));return Array.from({length:Math.min(5,s)},(m,o)=>e+o)})(),x=(e,m,o,d=!1)=>a.jsx("button",{disabled:e,onClick:m,className:`min-w-[32px] h-8 px-2 rounded-lg text-xs font-semibold flex items-center justify-center transition-all duration-150
        ${e?"opacity-30 cursor-not-allowed":"cursor-pointer"}
        ${d?"bg-[#2E86DE] text-white shadow-[0_2px_8px_rgba(46,134,222,0.35)]":c?"text-gray-400 hover:bg-gray-700 hover:text-white":"text-gray-500 hover:bg-[#EBF5FB] hover:text-[#2E86DE]"}`,children:o}),l=(t-1)*i+1,u=Math.min(t*i,n);return a.jsxs("div",{className:`flex items-center justify-between px-2 py-3 rounded-xl border
      ${c?"bg-gray-800 border-gray-700/60":"bg-white border-gray-100 shadow-[0_1px_4px_rgba(0,0,0,0.06)]"}`,children:[a.jsxs("p",{className:`text-xs font-medium tabular-nums ${c?"text-gray-500":"text-gray-400"}`,children:[l,"–",u," of ",n]}),a.jsxs("div",{className:"flex items-center gap-1",children:[x(t===1,()=>r(t-1),a.jsx(b,{className:"w-4 h-4"})),h.map(e=>x(!1,()=>r(e),e,e===t)),x(t===s,()=>r(t+1),a.jsx(y,{className:"w-4 h-4"}))]})]})};export{_ as C,b as a,j as p};
