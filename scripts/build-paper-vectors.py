from pathlib import Path
r=Path(__file__).resolve().parents[1]/'assets/paper-rounds'
base='<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="800" viewBox="0 0 1000 800"><rect width="1000" height="800" rx="60" fill="#efeee9"/>{}</svg>'
terminal='<rect x="160" y="130" width="680" height="460" rx="65" fill="#cbc9be"/><rect x="205" y="175" width="590" height="350" rx="30" fill="#293631"/><path d="m260 240 30 20-30 20m55 0h70" stroke="#b6c2ae" stroke-width="8" fill="none"/><path d="M200 635h600l65 80H135z" fill="#c4c0b2"/>'
for y in range(650,700,17):
 for x in range(230,760,32):terminal+=f'<rect x="{x}" y="{y}" width="22" height="10" rx="3" fill="#8e8c81"/>'
(r/'terminal.svg').write_text(base.format(terminal))
tetris='<rect x="250" y="65" width="500" height="670" rx="30" fill="#293631"/>'
for y,row in enumerate(['0000000000','0000000000','0000000000','0000010000','0000111000','0000000000','0000000000','0000000000','0000000000','0000000000','1000000000','1111000000','1111110000','1111111100']):
 for x,a in enumerate(row):
  if a=='1':tetris+=f'<rect x="{280+x*44}" y="{95+y*44}" width="40" height="40" rx="5" fill="{["#b9aa91","#9eaca4","#c0b79d"][y%3]}"/>'
(r/'tetris.svg').write_text(base.format(tetris))
projector='<circle cx="375" cy="245" r="130" fill="#c1b9a8"/><circle cx="650" cy="245" r="115" fill="#c1b9a8"/>'
for cx in [375,650]:
 for x,y in [(0,-65),(60,0),(0,65),(-60,0)]:projector+=f'<circle cx="{cx+x}" cy="{245+y}" r="27" fill="#efeee9"/>'
projector+='<rect x="280" y="335" width="455" height="245" rx="35" fill="#60625f"/><path d="m735 405 110-35v160l-110-35z" fill="#898b82"/><path d="m450 580-70 140m200-140 70 140" stroke="#60625f" stroke-width="20" stroke-linecap="round"/><circle cx="350" cy="415" r="25" fill="#aaa99b"/>'
(r/'projector.svg').write_text(base.format(projector))

ship='<path d="M190 540h650l-100 105H300z" fill="#8f7f67"/><path d="M440 150v390m190-340v340" stroke="#686b62" stroke-width="13" stroke-linecap="round"/><path d="M425 190Q230 300 425 450zm30 0q180 110 0 260zm160 55q-140 80 0 210zm28 0q150 80 0 210z" fill="#d4cdb9"/><path d="M150 700q90-35 180 0t180 0t180 0t180 0" stroke="#a5b3ae" stroke-width="12" fill="none" stroke-linecap="round"/>'
(r/'sailing-ship.svg').write_text(base.format(ship))
