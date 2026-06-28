import type { PetType } from '@/types/pet';

export type CutePetAvatarId = PetType;

const INK = '#27180f';

function wrapSvg(content: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><rect width="128" height="128" rx="28" fill="#ffffff"/><ellipse cx="64" cy="108" rx="40" ry="8" fill="#eaded0" opacity=".45"/><g stroke="${INK}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round">${content}</g></svg>`;
}

export const CUTE_PET_AVATAR_SVGS: Record<CutePetAvatarId, string> = {
  dog: wrapSvg(
    `<path d="M32 54c-14-15-24-9-22 8 2 15 10 27 23 29l9-24-10-13Z" fill="#d7a066"/>
<path d="M96 54c14-15 24-9 22 8-2 15-10 27-23 29l-9-24 10-13Z" fill="#d7a066"/>
<circle cx="64" cy="68" r="39" fill="#f4c77f"/>
<path d="M30 59c7-22 27-34 49-26 13 5 20 15 21 29-19-9-47-10-70-3Z" fill="#ffe0a6"/>
<path d="M43 70c5 4 11 4 16 0" fill="none"/>
<path d="M69 70c5 4 11 4 16 0" fill="none"/>
<path d="M58 81h12l-6 7-6-7Z" fill="${INK}"/>
<path d="M64 88v7" fill="none"/>
<path d="M53 98c7 6 15 6 22 0" fill="none"/>
<path d="M42 91c-8-1-13-6-13-13 9 2 14 6 16 13" fill="#8fcf9a"/>
<circle cx="42" cy="82" r="4.5" fill="#f3a98d" stroke="none" opacity=".5"/>
<circle cx="86" cy="82" r="4.5" fill="#f3a98d" stroke="none" opacity=".5"/>
<path d="M103 25c5 0 8 6 3 10l-7 7-7-7c-5-4-2-10 3-10 2 0 3 1 4 3 1-2 2-3 4-3Z" fill="#ff8a8a"/>
<path d="M22 29c5 1 8 4 9 9" fill="none" stroke="#f6b24f"/>
<path d="M16 37c5 0 9 2 12 6" fill="none" stroke="#f6b24f"/>`
  ),
  cat: wrapSvg(
    `<path d="M39 55 26 24l32 15" fill="#d8d0c8"/>
<path d="M89 55l13-31-32 15" fill="#d8d0c8"/>
<path d="M43 41c-11 3-19 9-24 19h90c-5-10-13-16-24-19-12-4-30-4-42 0Z" fill="#c9beb6"/>
<path d="M21 58h86v29c0 8-6 14-14 14H35c-8 0-14-6-14-14V58Z" fill="#d9a76f"/>
<path d="M21 58h86" fill="none"/>
<path d="M28 72h72" fill="none" opacity=".35"/>
<path d="M42 87c0 7 10 7 10 0V76H42v11Z" fill="#b88453"/>
<path d="M76 87c0 7 10 7 10 0V76H76v11Z" fill="#b88453"/>
<circle cx="64" cy="59" r="31" fill="#f2f0ec"/>
<path d="M40 35c8 13 39 13 48 0 10 7 14 16 12 29-5-11-15-17-36-17s-31 6-36 17c-2-13 2-22 12-29Z" fill="#8f8882"/>
<circle cx="51" cy="61" r="5" fill="${INK}"/>
<circle cx="77" cy="61" r="5" fill="${INK}"/>
<circle cx="52" cy="59" r="1.6" fill="#ffffff" stroke="none"/>
<circle cx="78" cy="59" r="1.6" fill="#ffffff" stroke="none"/>
<path d="M60 73h8l-4 5-4-5Z" fill="#d8897b"/>
<path d="M64 78v7" fill="none"/>
<path d="M55 86c6 4 12 4 18 0" fill="none"/>
<path d="M25 75h20" fill="none"/>
<path d="M23 84h21" fill="none"/>
<path d="M83 75h20" fill="none"/>
<path d="M84 84h21" fill="none"/>
<path d="M104 34c4 0 7 4 4 8l-5 5-5-5c-3-4 0-8 4-8 1 0 2 1 2 2 1-1 1-2 2-2Z" fill="#ff8a8a"/>`
  ),
  rabbit: wrapSvg(
    `<path d="M48 54c-8-31-3-48 10-45 10 2 12 25 6 49" fill="#f7f1ec"/>
<path d="M80 54c8-31 3-48-10-45-10 2-12 25-6 49" fill="#f7f1ec"/>
<path d="M53 49c-4-20-2-32 4-32 4 1 5 18 2 35" fill="#f6b7c7" stroke="none"/>
<path d="M75 49c4-20 2-32-4-32-4 1-5 18-2 35" fill="#f6b7c7" stroke="none"/>
<circle cx="64" cy="70" r="37" fill="#f7f1ec"/>
<circle cx="50" cy="70" r="5" fill="${INK}"/>
<circle cx="78" cy="70" r="5" fill="${INK}"/>
<circle cx="51" cy="68" r="1.6" fill="#ffffff" stroke="none"/>
<circle cx="79" cy="68" r="1.6" fill="#ffffff" stroke="none"/>
<path d="M60 82h8l-4 5-4-5Z" fill="#d98ba2"/>
<path d="M64 87v7" fill="none"/>
<path d="M55 95c6 4 12 4 18 0" fill="none"/>
<circle cx="47" cy="84" r="5" fill="#f3b8c6" stroke="none" opacity=".55"/>
<circle cx="81" cy="84" r="5" fill="#f3b8c6" stroke="none" opacity=".55"/>
<path d="M76 41c7-5 15-4 20 2-5 6-13 7-20 2v-4Z" fill="#ff8aa1"/>
<circle cx="76" cy="43" r="4" fill="#ff8aa1"/>
<path d="M25 39c-6 2-10 6-13 12" fill="none" stroke="#f6b24f"/>
<path d="M100 76c6 2 10 6 13 12" fill="none" stroke="#70bfd1"/>`
  ),
  bird: wrapSvg(
    `<path d="M35 72c0-23 17-39 40-35 20 4 32 23 26 44-6 21-30 31-50 20-10-6-16-16-16-29Z" fill="#79c8dd"/>
<path d="M43 45c-10 3-20 13-23 25 11 0 22-6 27-17" fill="#53a9c5"/>
<path d="M80 58c12 0 20 5 27 15-10 3-20 1-28-6" fill="#f4c76f"/>
<circle cx="77" cy="56" r="5" fill="${INK}"/>
<circle cx="78" cy="54" r="1.6" fill="#ffffff" stroke="none"/>
<path d="M58 82c7 5 17 5 24 0" fill="none"/>
<path d="M39 101c4 3 8 3 12 0" fill="none"/>
<path d="M55 103c4 3 8 3 12 0" fill="none"/>
<path d="M101 27c6 2 10 6 12 12" fill="none" stroke="#f6b24f"/>
<path d="M105 46h8" fill="none" stroke="#f6b24f"/>
<path d="M20 31c3 0 5 3 3 6l-4 4-4-4c-2-3 0-6 3-6 1 0 1 1 1 1s0-1 1-1Z" fill="#ff8a8a"/>`
  ),
  'small-mammal': wrapSvg(
    `<circle cx="37" cy="52" r="16" fill="#c9854c"/>
<circle cx="91" cy="52" r="16" fill="#c9854c"/>
<circle cx="37" cy="52" r="8" fill="#f1c491" stroke="none"/>
<circle cx="91" cy="52" r="8" fill="#f1c491" stroke="none"/>
<circle cx="64" cy="72" r="39" fill="#d99a5b"/>
<path d="M38 61c8-19 44-22 52 0-17-8-35-8-52 0Z" fill="#f1c491"/>
<ellipse cx="50" cy="84" rx="15" ry="13" fill="#f2d3aa" stroke="none"/>
<ellipse cx="78" cy="84" rx="15" ry="13" fill="#f2d3aa" stroke="none"/>
<circle cx="51" cy="68" r="5" fill="${INK}"/>
<circle cx="77" cy="68" r="5" fill="${INK}"/>
<circle cx="52" cy="66" r="1.5" fill="#ffffff" stroke="none"/>
<circle cx="78" cy="66" r="1.5" fill="#ffffff" stroke="none"/>
<path d="M59 79h10l-5 6-5-6Z" fill="${INK}"/>
<path d="M64 85v6" fill="none"/>
<path d="M56 93c5 4 11 4 16 0" fill="none"/>
<path d="M32 76h15" fill="none"/>
<path d="M81 76h15" fill="none"/>
<path d="M25 34c4 1 7 4 9 8" fill="none" stroke="#f6b24f"/>
<path d="M99 32c-4 1-7 4-9 8" fill="none" stroke="#f6b24f"/>`
  ),
  reptile: wrapSvg(
    `<path d="M17 75c13-28 52-43 87-25 10 5 12 18 2 25-22 17-68 20-89 0Z" fill="#82d493"/>
<path d="M35 58c18-9 43-10 62-3" fill="none" opacity=".55"/>
<path d="M51 46c6 4 12 5 18 2" fill="none" opacity=".55"/>
<circle cx="83" cy="59" r="5" fill="${INK}"/>
<circle cx="84" cy="57" r="1.5" fill="#ffffff" stroke="none"/>
<path d="M91 73c8 1 14 5 19 11" fill="none"/>
<path d="M44 83c-8 4-17 5-27 3" fill="none"/>
<path d="M48 49c-5-7-13-10-23-8" fill="none"/>
<path d="M72 42c3-5 8-8 15-9" fill="none"/>
<path d="M103 32c4 0 7 4 4 8l-5 5-5-5c-3-4 0-8 4-8 1 0 2 1 2 2 1-1 1-2 2-2Z" fill="#ff8a8a"/>`
  ),
  fish: wrapSvg(
    `<path d="M19 64c15-21 49-27 75-3 8-9 17-13 28-13-5 12-5 21 0 32-11 0-20-4-28-13-26 24-60 18-75-3Z" fill="#79c8dd"/>
<path d="M39 79c-9 7-18 9-28 7 5-8 12-13 22-15" fill="#f4c76f"/>
<circle cx="49" cy="59" r="5" fill="${INK}"/>
<circle cx="50" cy="57" r="1.6" fill="#ffffff" stroke="none"/>
<path d="M64 49c6 8 6 23 0 31" fill="none"/>
<path d="M78 52c5 7 5 19 0 26" fill="none" opacity=".6"/>
<circle cx="34" cy="32" r="4" fill="#b9e6f0" opacity=".8"/>
<circle cx="23" cy="43" r="3" fill="#b9e6f0" opacity=".8"/>
<circle cx="42" cy="21" r="2.5" fill="#b9e6f0" opacity=".8"/>
<path d="M103 31c4 1 7 4 8 8" fill="none" stroke="#f6b24f"/>`
  ),
  other: wrapSvg(
    `<circle cx="64" cy="70" r="37" fill="#f4c76f"/>
<path d="M42 51c3-13 12-20 22-20s19 7 22 20" fill="#e96b2c"/>
<circle cx="51" cy="69" r="5" fill="${INK}"/>
<circle cx="77" cy="69" r="5" fill="${INK}"/>
<circle cx="52" cy="67" r="1.5" fill="#ffffff" stroke="none"/>
<circle cx="78" cy="67" r="1.5" fill="#ffffff" stroke="none"/>
<path d="M58 81h12l-6 7-6-7Z" fill="${INK}"/>
<path d="M64 88v6" fill="none"/>
<path d="M55 96c6 5 12 5 18 0" fill="none"/>
<path d="M31 39c-8 2-14 8-18 16" fill="none"/>
<path d="M97 39c8 2 14 8 18 16" fill="none"/>
<path d="M103 26c5 0 8 6 3 10l-7 7-7-7c-5-4-2-10 3-10 2 0 3 1 4 3 1-2 2-3 4-3Z" fill="#ff8a8a"/>`
  ),
};
