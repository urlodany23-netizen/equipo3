import { useId } from "react";

function ElectricGuitar({ variant, className }) {
  const id = useId();
  const isCrimson = variant === "crimson";

  return (
    <svg className={className} viewBox="0 0 220 590" fill="none" focusable="false">
      <defs>
        <linearGradient id={`${id}-body`} x1="40" y1="345" x2="185" y2="565" gradientUnits="userSpaceOnUse">
          <stop stopColor={isCrimson ? "#eb8698" : "#ffb0b6"} />
          <stop offset="0.45" stopColor={isCrimson ? "#a51236" : "#ef2f47"} />
          <stop offset="1" stopColor={isCrimson ? "#360917" : "#730b1d"} />
        </linearGradient>
        <linearGradient id={`${id}-metal`} x1="80" x2="136" gradientUnits="userSpaceOnUse">
          <stop stopColor="#555767" />
          <stop offset="0.45" stopColor="#e9e9ed" />
          <stop offset="1" stopColor="#686879" />
        </linearGradient>
        <linearGradient id={`${id}-neck`} x1="96" x2="127" gradientUnits="userSpaceOnUse">
          <stop stopColor="#191920" />
          <stop offset="0.5" stopColor="#3b2e32" />
          <stop offset="1" stopColor="#121217" />
        </linearGradient>
      </defs>

      {/* A pointed headstock, six tuners, fretted neck and two humbuckers. */}
      <path d="m102 112-6-52 41-42-12 89-2 21Z" fill={`url(#${id}-body)`} stroke="#dedbe4" strokeOpacity=".6" />
      {[0, 1, 2, 3, 4, 5].map((tuner) => (
        <g key={tuner} transform={`translate(${96 + tuner * 5}, ${61 - tuner * 5})`}>
          <path d="m0 0-8-7" stroke="#b7b5c5" strokeWidth="3" />
          <rect x="-15" y="-14" width="10" height="7" rx="2" fill={`url(#${id}-metal)`} transform="rotate(35 -10 -10)" />
        </g>
      ))}
      <path d="m101 112-7 275h34l-6-275Z" fill={`url(#${id}-neck)`} stroke="#bfa6aa" strokeWidth="2" />
      {[126, 146, 165, 183, 201, 218, 234, 249, 264, 278, 291, 303, 315, 326, 337, 347, 357, 367, 377].map((y) => (
        <path key={y} d={`M99 ${y}h26`} stroke="#93909c" strokeWidth="1.5" />
      ))}
      {[174, 210, 241, 271, 308, 342].map((y) => (
        <path key={y} d={`m111 ${y}-3 3 3 3 3-3Z`} fill="#ddd7e9" />
      ))}
      <path
        d={isCrimson
          ? "m91 349-60 37L13 553l86-61 85 70-35-183-23-30-2 55H96Z"
          : "m93 347-44-26 12 59-45 70 5 69 50 43 112-18 23-109-63-76-16-20-3 65H96Z"}
        fill={`url(#${id}-body)`}
        stroke={isCrimson ? "#df778b" : "#ff9aa4"}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d={isCrimson ? "m82 387-38 126 57-37 57 45-30-132Z" : "m77 389-36 58 9 58 33 28 64-18 24-71-42-56Z"} fill="#14151a" stroke="#4f5354" />
      {[401, 439].map((y) => (
        <g key={y}>
          <rect x="87" y={y} width="48" height="24" rx="3" fill={`url(#${id}-metal)`} />
          <rect x="91" y={y + 4} width="40" height="6" rx="2" fill="#22232a" />
          <rect x="91" y={y + 14} width="40" height="6" rx="2" fill="#22232a" />
          {[96, 102, 108, 114, 120, 126].map((x) => <circle key={x} cx={x} cy={y + 7} r="1" fill="#d8d7e0" />)}
        </g>
      ))}
      <rect x="88" y="478" width="46" height="16" rx="2" fill={`url(#${id}-metal)`} />
      <g opacity=".7" className="guitar-strings">
        {[103, 106, 109, 112, 115, 118].map((x, i) => <path key={x} d={`M${105 + i * 4} ${76 - i * 5} ${x} 114 ${x - 2 + i} 488`} stroke="#f5eef9" strokeWidth={0.5 + i * 0.09} />)}
      </g>
      <path d="m128 487 19 24 14-6" stroke="#d5d4df" strokeWidth="3" strokeLinecap="round" />
      <circle cx="158" cy="471" r="8" fill={`url(#${id}-metal)`} stroke="#15151b" strokeWidth="3" />
      <circle cx="151" cy="495" r="7" fill={`url(#${id}-metal)`} stroke="#15151b" strokeWidth="3" />
      <path d="m65 438-11 27 13-8-8 27 26-38-16 8 9-16Z" fill={isCrimson ? "#ef93a5" : "#ffbcc3"} />
      <path d="M84 548h25" stroke="#fff" strokeOpacity=".4" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function LightningArc({ className, path, branches }) {
  return (
    <g className={`lightning ${className}`}>
      <path className="lightning-aura" d={path} />
      <path className="lightning-branches" d={branches} />
      <path className="lightning-body" d={path} />
      <path className="lightning-core" d={path} />
      <path className="lightning-energy" d={path} pathLength="100" />
    </g>
  );
}

export default function ElectricStage() {
  return (
    <div className="electric-stage" aria-hidden="true">
      <div className="stage-orbit stage-orbit--outer" />
      <div className="stage-orbit stage-orbit--inner" />
      <div className="stage-halo" />
      <span className="stage-coordinate">DISTORTION / 100%</span>
      <span className="stage-coordinate stage-coordinate--right">VOL. 11</span>
      <svg className="stage-lightning" viewBox="0 0 660 350" fill="none" focusable="false">
        <LightningArc
          className="lightning--left"
          path="M0 92 34 102 48 91 77 130 100 124 89 148 141 156 164 142 150 178 193 168 210 190 241 181 268 204 296 196"
          branches="M77 130 62 171 80 182 55 217 69 239M150 178 147 219 170 226 157 258 184 278M48 91 53 65 38 48M210 190 225 148 248 155 257 128"
        />
        <LightningArc
          className="lightning--right"
          path="M660 42 618 75 593 67 608 99 561 113 543 139 555 151 508 157 518 181 471 177 445 207 421 198 395 230"
          branches="M561 113 543 78 516 88 523 49 502 24M518 181 554 202 546 220 584 238 575 268M618 75 643 99 629 120M445 207 427 176 409 182 403 151"
        />
        <LightningArc
          className="lightning--lower"
          path="M18 284 61 260 88 274 104 255 140 267 169 245 187 268 234 254 256 275 294 267 320 292 367 280 389 296 421 270 447 280 482 252 503 260 544 236 573 246 639 213"
          branches="M140 267 128 292 153 308M482 252 473 220 489 207M61 260 42 242 49 225"
        />
      </svg>
      <div className="guitar-float guitar-float--crimson">
        <ElectricGuitar variant="crimson" className="stage-guitar stage-guitar--crimson" />
      </div>
      <div className="guitar-float guitar-float--scarlet">
        <ElectricGuitar variant="scarlet" className="stage-guitar stage-guitar--scarlet" />
      </div>
      <div className="stage-sparks">
        {Array.from({ length: 8 }, (_, i) => <span key={i} style={{ "--spark": i }} />)}
      </div>
      <div className="stage-caption"><span /> RIFFS QUE NOS CONECTAN <span /></div>
    </div>
  );
}
