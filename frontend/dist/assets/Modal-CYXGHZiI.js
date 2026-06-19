import{c,u as m,r as o,j as e,X as b}from"./index-SGtv6yCJ.js";/**
 * @license lucide-react v0.294.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const h=c("Plus",[["path",{d:"M5 12h14",key:"1ays0h"}],["path",{d:"M12 5v14",key:"s699le"}]]),d={sm:"max-w-md",md:"max-w-2xl",lg:"max-w-4xl",xl:"max-w-6xl",full:"max-w-full mx-4"},f=({isOpen:a,onClose:t,title:i,children:n,size:x="md"})=>{const{darkMode:r}=m();o.useEffect(()=>(a&&(document.body.style.overflow="hidden"),()=>{document.body.style.overflow=""}),[a]);const l=o.useCallback(s=>{s.key==="Escape"&&t()},[t]);return o.useEffect(()=>(a&&document.addEventListener("keydown",l),()=>document.removeEventListener("keydown",l)),[a,l]),a?e.jsxs("div",{className:"fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6","aria-modal":"true",role:"dialog",children:[e.jsx("div",{className:"absolute inset-0 bg-[#2C3E50]/50 backdrop-blur-[2px] animate-fade-in",onClick:t}),e.jsxs("div",{className:`relative w-full ${d[x]||d.md}
          max-h-[90vh] flex flex-col
          rounded-2xl overflow-hidden
          animate-scale-in
          border
          ${r?"bg-gray-800 border-gray-700/60":"bg-white border-[#E2E8F0]"}`,style:{boxShadow:r?"0 32px 64px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)":"0 24px 60px rgba(44,62,80,0.16), 0 0 0 1px rgba(46,134,222,0.06)"},onClick:s=>s.stopPropagation(),children:[e.jsxs("div",{className:`flex items-center justify-between px-6 py-4 border-b flex-shrink-0
            ${r?"border-gray-700/80 bg-gray-800":"border-gray-100 bg-white"}`,children:[e.jsx("h3",{className:`text-base font-semibold leading-tight
            ${r?"text-white":"text-gray-900"}`,children:i}),e.jsx("button",{onClick:t,className:`ml-4 p-2 rounded-lg transition-all duration-200 flex-shrink-0
              ${r?"text-gray-400 hover:text-white hover:bg-gray-700":"text-gray-400 hover:text-gray-700 hover:bg-gray-100"}`,"aria-label":"Close modal",children:e.jsx(b,{className:"w-4 h-4"})})]}),e.jsx("div",{className:"flex-1 overflow-y-auto px-6 py-5 scrollbar-thin",children:n})]})]}):null};export{f as M,h as P};
