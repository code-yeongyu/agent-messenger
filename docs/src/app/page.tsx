'use client'

import { useTheme } from 'next-themes'
import Link from 'next/link'
import { useEffect, useState } from 'react'

// ============================================================
// Platform Icon Components (128x128 viewBox with brand colors)
// ============================================================

function SlackIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 128 128" fill="currentColor" className={className} style={style}>
      <title>Slack icon</title>
      <path
        d="M27.255 80.719c0 7.33-5.978 13.317-13.309 13.317C6.616 94.036.63 88.049.63 80.719s5.987-13.317 13.317-13.317h13.309zm6.709 0c0-7.33 5.987-13.317 13.317-13.317s13.317 5.986 13.317 13.317v33.335c0 7.33-5.986 13.317-13.317 13.317-7.33 0-13.317-5.987-13.317-13.317zm0 0"
        fill="#de1c59"
      />
      <path
        d="M47.281 27.255c-7.33 0-13.317-5.978-13.317-13.309C33.964 6.616 39.951.63 47.281.63s13.317 5.987 13.317 13.317v13.309zm0 6.709c7.33 0 13.317 5.987 13.317 13.317s-5.986 13.317-13.317 13.317H13.946C6.616 60.598.63 54.612.63 47.281c0-7.33 5.987-13.317 13.317-13.317zm0 0"
        fill="#35c5f0"
      />
      <path
        d="M100.745 47.281c0-7.33 5.978-13.317 13.309-13.317 7.33 0 13.317 5.987 13.317 13.317s-5.987 13.317-13.317 13.317h-13.309zm-6.709 0c0 7.33-5.987 13.317-13.317 13.317s-13.317-5.986-13.317-13.317V13.946C67.402 6.616 73.388.63 80.719.63c7.33 0 13.317 5.987 13.317 13.317zm0 0"
        fill="#2eb67d"
      />
      <path
        d="M80.719 100.745c7.33 0 13.317 5.978 13.317 13.309 0 7.33-5.987 13.317-13.317 13.317s-13.317-5.987-13.317-13.317v-13.309zm0-6.709c-7.33 0-13.317-5.987-13.317-13.317s5.986-13.317 13.317-13.317h33.335c7.33 0 13.317 5.986 13.317 13.317 0 7.33-5.987 13.317-13.317 13.317zm0 0"
        fill="#ecb22d"
      />
    </svg>
  )
}

function DiscordIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 128 128" fill="currentColor" className={className} style={style}>
      <title>Discord icon</title>
      <path
        d="M107.7,30.8c-8-3.7-16.5-6.4-25.5-7.9c-0.1,0-0.2,0-0.3,0.1c-1.1,2-2.3,4.5-3.2,6.6c-9.6-1.4-19.2-1.4-28.6,0c-0.9-2.1-2.1-4.6-3.2-6.6c-0.1-0.1-0.2-0.1-0.3-0.1c-8.9,1.5-17.5,4.2-25.5,7.9c0,0-0.1,0.1-0.1,0.1C7.1,51.5,3,71.7,5.1,91.6c0,0.1,0.1,0.2,0.1,0.2c10.7,7.9,21.1,12.7,31.3,15.8c0.1,0,0.2,0,0.3-0.1c2.4-3.3,4.6-6.8,6.4-10.4c0.1-0.2,0-0.4-0.2-0.5c-3.4-1.3-6.7-2.9-9.8-4.7c-0.2-0.1-0.2-0.4,0-0.6c0.7-0.5,1.3-1,1.9-1.5c0.1-0.1,0.2-0.1,0.3,0c20.6,9.4,42.9,9.4,63.3,0c0.1-0.1,0.2,0,0.3,0c0.6,0.5,1.3,1,1.9,1.5c0.2,0.2,0.2,0.4,0,0.6c-3.1,1.9-6.4,3.5-9.8,4.7c-0.2,0.1-0.3,0.3-0.2,0.5c1.9,3.6,4,7.1,6.4,10.4c0.1,0.1,0.2,0.1,0.3,0.1c10.2-3.1,20.6-7.9,31.3-15.8c0.1-0.1,0.1-0.1,0.1-0.2C125.6,68.8,119.2,49.2,107.7,30.8C107.7,30.9,107.7,30.8,107.7,30.8z M45.3,79.9c-5.3,0-9.6-4.8-9.6-10.8s4.2-10.8,9.6-10.8c5.4,0,9.7,4.9,9.6,10.8C54.9,75.1,50.6,79.9,45.3,79.9z M82.8,79.9c-5.3,0-9.6-4.8-9.6-10.8s4.2-10.8,9.6-10.8c5.4,0,9.7,4.9,9.6,10.8C92.4,75.1,88.2,79.9,82.8,79.9z"
        fill="#5865f2"
      />
    </svg>
  )
}

function TeamsIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 128 128" fill="currentColor" className={className} style={style}>
      <title>Teams icon</title>
      <path
        d="M86.3,44.5h32.5c2.6,0,4.7,2.1,4.7,4.7v29.4c0,12.9-10.5,23.4-23.4,23.4h-0.3c-12.9,0-23.4-10.5-23.4-23.4V54.4C76.4,48.9,80.8,44.5,86.3,44.5z"
        fill="#5059c9"
      />
      <circle cx="108.1" cy="26.8" r="17.8" fill="#5059c9" />
      <path
        d="M64.7,44.5H24.9c-2.5,0-4.5,2-4.5,4.5v38.2c0,19.5,15.8,35.3,35.3,35.3h0.1c19.5,0,35.3-15.8,35.3-35.3V53.4C91.1,48.5,87.1,44.5,82.2,44.5H64.7z"
        fill="#7b83eb"
      />
      <circle cx="55.8" cy="22.3" r="22.3" fill="#7b83eb" />
      <path
        d="M55.8,44.5H24.9c-2.5,0-4.5,2-4.5,4.5v38.2c0,16.6,11.5,30.5,27,34.2V63.5c0-10.5,8.5-19,19-19h16.4C79.2,36.2,68.6,30,55.8,30V44.5z"
        opacity="0.1"
      />
      <path
        d="M50.3,50H24.9c-2.5,0-4.5,2-4.5,4.5v38.2c0,17.9,13.3,32.7,30.5,35v-58C50.9,62.5,50.6,56.1,50.3,50z"
        opacity="0.2"
      />
      <path
        d="M4.5,49V87c0,17.3,12.5,31.9,29.3,34.8c-1-0.2-1.9-0.4-2.9-0.6v-58C24.6,55.4,16.4,50.3,4.5,49z"
        fill="#7b83eb"
        opacity="0.2"
      />
      <rect x="4.5" y="44.5" width="65.3" height="65.3" rx="4.5" fill="url(#teams-gradient)" />
      <defs>
        <linearGradient id="teams-gradient" x1="4.5" y1="44.5" x2="69.8" y2="109.8" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#5a62c3" />
          <stop offset="0.5" stopColor="#4d55bd" />
          <stop offset="1" stopColor="#3940ab" />
        </linearGradient>
      </defs>
      <path
        d="M42.4,60.5H27.6v27.8h6.7V75.1h7.8c5.5,0,10-4.5,10-10v-0.4c0-2.3-0.8-4.2-2.4-5.8C48,57.3,45.5,60.5,42.4,60.5z M42.1,69.5h-7.8v-5.4h7.8c1.5,0,2.7,1.2,2.7,2.7S43.6,69.5,42.1,69.5z"
        fill="white"
      />
    </svg>
  )
}

function TelegramIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 240 240" className={className} style={style}>
      <title>Telegram icon</title>
      <defs>
        <linearGradient id="telegram-grad" x1="120" y1="240" x2="120" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#1D93D2" />
          <stop offset="1" stopColor="#38B0E3" />
        </linearGradient>
      </defs>
      <circle cx="120" cy="120" r="120" fill="url(#telegram-grad)" />
      <path
        fill="#C8DAEA"
        d="M81.229,128.772l14.237,39.406s1.78,3.687,3.686,3.687,30.255-29.492,30.255-29.492l31.525-60.89L81.737,118.6Z"
      />
      <path fill="#A9C6D8" d="M100.106,138.878l-2.733,29.046s-1.144,8.9,7.754,0,17.415-15.763,17.415-15.763" />
      <path
        fill="#FFFFFF"
        d="M81.486,130.178,52.2,120.636s-3.5-1.42-2.373-4.64c.232-.664.7-1.229,2.1-2.2,6.489-4.523,120.106-45.36,120.106-45.36s3.208-1.081,5.1-.362a2.766,2.766,0,0,1,1.885,2.055,9.357,9.357,0,0,1,.254,2.585c-.009.752-.1,1.449-.169,2.542-.692,11.165-21.4,94.493-21.4,94.493s-1.239,4.876-5.678,5.043A8.13,8.13,0,0,1,146.1,172.5c-8.711-7.493-38.819-27.727-45.472-32.177a1.27,1.27,0,0,1-.546-.9c-.093-.469.417-1.05.417-1.05s52.426-46.6,53.821-51.492c.108-.379-.3-.566-.848-.4-3.482,1.281-63.844,39.4-70.506,43.607A3.21,3.21,0,0,1,81.486,130.178Z"
      />
    </svg>
  )
}

function WhatsAppIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style}>
      <title>WhatsApp icon</title>
      <path
        fill="#25D366"
        d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"
      />
    </svg>
  )
}

function KakaoTalkIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 256 256" className={className} style={style}>
      <title>KakaoTalk icon</title>
      <path
        fill="#FFE812"
        d="M256 236c0 11.046-8.954 20-20 20H20c-11.046 0-20-8.954-20-20V20C0 8.954 8.954 0 20 0h216c11.046 0 20 8.954 20 20v216z"
      />
      <path
        fill="#3C1E1E"
        d="M128 36C70.562 36 24 72.713 24 118c0 29.279 19.466 54.97 48.748 69.477-1.593 5.494-10.237 35.344-10.581 37.689 0 0-.207 1.762.934 2.434s2.483.15 2.483.15c3.272-.457 37.943-24.811 43.944-29.04 5.995.849 12.168 1.29 18.472 1.29 57.438 0 104-36.712 104-82 0-45.287-46.562-82-104-82z"
      />
      <path
        fill="#FFE812"
        d="M70.5 146.625c-3.309 0-6-2.57-6-5.73V105.25h-9.362c-3.247 0-5.888-2.636-5.888-5.875s2.642-5.875 5.888-5.875h30.724c3.247 0 5.888 2.636 5.888 5.875s-2.642 5.875-5.888 5.875H76.5v35.645c0 3.16-2.691 5.73-6 5.73zM123.112 146.547c-2.502 0-4.416-1.016-4.993-2.65l-2.971-7.778-18.296-.001-2.973 7.783c-.575 1.631-2.488 2.646-4.99 2.646a9.155 9.155 0 0 1-3.814-.828c-1.654-.763-3.244-2.861-1.422-8.52l14.352-37.776c1.011-2.873 4.082-5.833 7.99-5.922 3.919.088 6.99 3.049 8.003 5.928l14.346 37.759c1.826 5.672.236 7.771-1.418 8.532a9.176 9.176 0 0 1-3.814.827zm-11.119-21.056L106 108.466l-5.993 17.025h11.986zM138 145.75c-3.171 0-5.75-2.468-5.75-5.5V99.5c0-3.309 2.748-6 6.125-6s6.125 2.691 6.125 6v35.25h12.75c3.171 0 5.75 2.468 5.75 5.5s-2.579 5.5-5.75 5.5H138zM171.334 146.547c-3.309 0-6-2.691-6-6V99.5c0-3.309 2.691-6 6-6s6 2.691 6 6v12.896l16.74-16.74c.861-.861 2.044-1.335 3.328-1.335 1.498 0 3.002.646 4.129 1.772 1.051 1.05 1.678 2.401 1.764 3.804.087 1.415-.384 2.712-1.324 3.653l-13.673 13.671 14.769 19.566a5.951 5.951 0 0 1 1.152 4.445 5.956 5.956 0 0 1-2.328 3.957 5.94 5.94 0 0 1-3.609 1.211 5.953 5.953 0 0 1-4.793-2.385l-14.071-18.644-2.082 2.082v13.091a6.01 6.01 0 0 1-6.002 6.003z"
      />
    </svg>
  )
}

function LineIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style}>
      <title>LINE icon</title>
      <path
        fill="#06C755"
        d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"
      />
    </svg>
  )
}

function InstagramIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 3364.7 3364.7" className={className} style={style}>
      <title>Instagram icon</title>
      <defs>
        <radialGradient id="insta-grad-a" cx="217.8" cy="3291" r="4271.9" gradientUnits="userSpaceOnUse">
          <stop offset=".1" stopColor="#FA8F21" />
          <stop offset=".8" stopColor="#D82D7E" />
        </radialGradient>
        <radialGradient id="insta-grad-b" cx="2330.6" cy="3182.9" r="3759.3" gradientUnits="userSpaceOnUse">
          <stop offset=".6" stopColor="#8C3AAA" stopOpacity="0" />
          <stop offset="1" stopColor="#8C3AAA" />
        </radialGradient>
      </defs>
      <path
        fill="url(#insta-grad-a)"
        d="M853.2 3352.8c-200.1-9.1-308.8-42.4-381.1-70.6-95.8-37.3-164.1-81.7-236-153.5s-116.4-140.1-153.5-235.9c-28.2-72.3-61.5-181-70.6-381.1-10-216.3-12-281.2-12-829.2s2.2-612.8 11.9-829.3C21 653.1 54.5 544.6 82.5 472.1A640 640 0 0 1 236 236 633.5 633.5 0 0 1 472 82.5C544.3 54.3 653 21 853.1 11.9 1069.5 2 1134.5 0 1682.3 0c548 0 612.8 2.2 829.3 11.9 200.1 9.1 308.6 42.6 381.1 70.6 95.8 37.1 164.1 81.7 236 153.5s116.2 140.2 153.5 236c28.2 72.3 61.5 181 70.6 381.1 9.9 216.5 11.9 281.3 11.9 829.3 0 547.8-2 612.8-11.9 829.3-9.1 200.1-42.6 308.8-70.6 381.1-37.3 95.8-81.7 164.1-153.5 235.9s-140.2 116.2-236 153.5c-72.3 28.2-181 61.5-381.1 70.6-216.3 9.9-281.3 11.9-829.3 11.9-547.8 0-612.8-1.9-829.1-11.9"
      />
      <path
        fill="url(#insta-grad-b)"
        d="M853.2 3352.8c-200.1-9.1-308.8-42.4-381.1-70.6-95.8-37.3-164.1-81.7-236-153.5s-116.4-140.1-153.5-235.9c-28.2-72.3-61.5-181-70.6-381.1-10-216.3-12-281.2-12-829.2s2.2-612.8 11.9-829.3C21 653.1 54.5 544.6 82.5 472.1A640 640 0 0 1 236 236 633.5 633.5 0 0 1 472 82.5C544.3 54.3 653 21 853.1 11.9 1069.5 2 1134.5 0 1682.3 0c548 0 612.8 2.2 829.3 11.9 200.1 9.1 308.6 42.6 381.1 70.6 95.8 37.1 164.1 81.7 236 153.5s116.2 140.2 153.5 236c28.2 72.3 61.5 181 70.6 381.1 9.9 216.5 11.9 281.3 11.9 829.3 0 547.8-2 612.8-11.9 829.3-9.1 200.1-42.6 308.8-70.6 381.1-37.3 95.8-81.7 164.1-153.5 235.9s-140.2 116.2-236 153.5c-72.3 28.2-181 61.5-381.1 70.6-216.3 9.9-281.3 11.9-829.3 11.9-547.8 0-612.8-1.9-829.1-11.9"
      />
      <path
        fill="#FFFFFF"
        d="M1269.3 1689.5a416.6 416.6 0 1 1 833.2 0 416.6 416.6 0 0 1-833.3 0m-225.2 0a641.8 641.8 0 1 0 1283.7 0 641.8 641.8 0 0 0-1283.7 0m1159.1-667.3a150 150 0 1 0 150-150 150 150 0 0 0-150 150M1181 2707c-122-5.5-188.2-25.8-232.2-43-58.3-22.7-100-49.8-143.8-93.5s-70.8-85.3-93.5-143.7c-17.1-44-37.4-110.2-43-232.1-6-131.8-7.2-171.3-7.2-505.2s1.3-373.2 7.2-505.1c5.6-121.9 26-188 43-232.1 22.8-58.4 49.8-100 93.5-143.8s85.4-70.9 143.8-93.5c44-17.2 110.3-37.5 232.1-43 131.8-6 171.4-7.3 505-7.3s373.3 1.3 505.2 7.3c121.9 5.6 188 26 232.1 43 58.4 22.6 100 49.8 143.8 93.5s70.8 85.4 93.5 143.8c17.2 44 37.5 110.2 43 232.1 6 131.9 7.3 171.3 7.3 505.2s-1.2 373.2-7.3 505.1c-5.5 121.9-26 188.1-43 232.1-22.7 58.4-49.8 100-93.5 143.7s-85.4 70.8-143.8 93.5c-44 17.2-110.2 37.5-232.1 43-131.8 6-171.3 7.3-505.1 7.3s-373.3-1.2-505-7.3m-10.4-2260c-133 6.2-224 27.3-303.4 58.2-82.2 31.9-151.9 74.7-221.4 144.1S533.4 788.5 501.5 870.8c-31 79.4-52 170.3-58 303.4-6.2 133.3-7.6 175.9-7.6 515.3s1.4 382 7.5 515.4c6 133 27.2 224 58 303.4 32 82.2 74.7 152 144.3 221.4S784.8 2842 867 2874c79.6 30.9 170.3 52 303.4 58 133.4 6.1 175.9 7.6 515.4 7.6s382-1.4 515.3-7.6c133-6 224-27.1 303.4-58 82.2-32 151.9-74.7 221.4-144.2s112.2-139.2 144.2-221.4c31-79.5 52.1-170.4 58-303.4 6.1-133.4 7.5-176 7.5-515.4s-1.4-382-7.4-515.3c-6-133.1-27.2-224-58-303.4-32-82.2-74.8-151.9-144.3-221.5s-139.2-112.2-221.3-144.2c-79.5-30.9-170.4-52-303.4-58-133.3-6.1-175.9-7.6-515.3-7.6s-382.1 1.4-515.4 7.6"
      />
    </svg>
  )
}

function ChannelTalkIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style}>
      <title>Channel Talk icon</title>
      <path
        fill="#1B64DA"
        d="M14.72 2A7.28 7.28 0 0 1 22 9.28v5.44A7.28 7.28 0 0 1 14.72 22H9.28A7.28 7.28 0 0 1 2 14.72V9.28A7.28 7.28 0 0 1 9.28 2zm-2.713 4a6 6 0 0 0-6.003 6.002c0 3.303 2.7 5.999 6.003 5.999.822 0 1.604-.166 2.318-.466a2.24 2.24 0 0 1 1.404-.102l1.304.325a.6.6 0 0 0 .728-.727l-.326-1.304a2.24 2.24 0 0 1 .103-1.405c.3-.715.465-1.497.465-2.32C18.003 8.699 15.31 6 12.007 6m-2.345 6.191a.303.303 0 0 1 .425.127 2.149 2.149 0 0 0 3.824 0 .304.304 0 0 1 .425-.127l1.074.644a.3.3 0 0 1 .113.397A4 4 0 0 1 12 15.336h-.004a4 4 0 0 1-3.521-2.104.3.3 0 0 1 .11-.397z"
      />
    </svg>
  )
}

function WebexIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style}>
      <title>Webex icon</title>
      <path
        fill="#07C3F2"
        d="M21.78 7.376c.512 1.181.032 2.644-1.11 3.106-2.157.888-3-1.295-3-1.295-.236-.55-.727-1.496-1.335-1.496-.204 0-.503 0-.94.844-.229.443-.434 1.185-.616 1.84l-.09.32c-.373-1.587-.821-3.454-1.536-4.816-.195-.38-.42-.74-.673-1.08a5.135 5.135 0 0 1 1.743-1.337 4.891 4.891 0 0 1 2.112-.463c1.045 0 2.765.338 4.227 2.227.167.206.317.424.448.654.278.441.52.904.726 1.383l.043.113zM.02 8.4C-.15 7.105.8 5.845 1.953 5.755c1.794-.157 2.36 1.385 2.455 1.89l.022.137c.07.44.29 1.838.48 2.744.078.4.244 1.013.353 1.416l.006.022.026.092c.11.4.232.799.362 1.193.185.548.399 1.085.641 1.61.47.955.93 1.45 1.367 1.45.203 0 .512 0 .96-.878.283-.59.512-1.208.684-1.845.373 1.598.811 3.128 1.495 4.456.205.406.444.794.715 1.16a5.124 5.124 0 0 1-1.742 1.338 4.88 4.88 0 0 1-2.112.461c-1.548 0-3.727-.698-5.339-4.005a22.407 22.407 0 0 1-1.078-2.824 26.848 26.848 0 0 1-.693-2.656 48.56 48.56 0 0 1-.215-1.114C.191 9.603.074 8.872.02 8.4zm22.047-2.645-.202-.022h-.052c.222.392.421.797.597 1.215l.053.113c.322.76.346 1.614.068 2.391a3.079 3.079 0 0 1-1.552 1.749 2.93 2.93 0 0 1-1.228.28 3.115 3.115 0 0 1-.854-.135c-.299 1.182-.768 2.634-1.195 3.511-.427.877-.93 1.451-1.378 1.451-.192 0-.501 0-.95-.877a10.746 10.746 0 0 1-.683-1.845 38.722 38.722 0 0 1-.396-1.575 12.67 12.67 0 0 1-.136-.598l-.002-.01c-.406-1.778-.865-3.645-1.655-5.142A8.263 8.263 0 0 0 11.52 4.8a5.136 5.136 0 0 0-1.748-1.34A4.892 4.892 0 0 0 7.654 3c-1.036 0-2.754.338-4.217 2.228.466.223.867.562 1.164.984.305.433.499.933.565 1.458.076.563.256 1.654.47 2.688l.001.007c.021.11.042.221.073.342.126-.34.25-.642.38-.955l.112-.271.128-.293c.235-.55.726-1.496 1.324-1.496.213 0 .513 0 .95.844.296.606.532 1.239.706 1.89.138.507.276 1.047.394 1.587.04.148.07.296.101.444l.006.028c.427 1.879.875 3.69 1.644 5.187.159.317.34.622.545.911.15.215.31.422.48.62 1.27 1.45 2.733 1.8 3.843 1.8 1.548 0 3.738-.698 5.35-4.006.822-1.7 1.515-4.208 1.772-5.48.256-1.27.449-2.419.534-3.115.04-.307.023-.618-.051-.918-.075-.299-.205-.579-.382-.825a2.247 2.247 0 0 0-.653-.607 2.143 2.143 0 0 0-.826-.296z"
      />
    </svg>
  )
}

function WeChatIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style}>
      <title>WeChat icon</title>
      <path
        fill="#07C160"
        d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178A1.17 1.17 0 0 1 4.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 0 1-1.162 1.178 1.17 1.17 0 0 1-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 0 1 .598.082l1.584.926a.272.272 0 0 0 .14.047c.134 0 .24-.111.24-.247 0-.06-.023-.12-.038-.177l-.327-1.233a.582.582 0 0 1-.023-.156.49.49 0 0 1 .201-.398C23.024 18.48 24 16.82 24 14.98c0-3.21-2.931-5.837-6.656-6.088V8.89c-.135-.01-.27-.027-.407-.03zm-2.53 3.274c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.97-.982zm4.844 0c.535 0 .969.44.969.982a.976.976 0 0 1-.969.983.976.976 0 0 1-.969-.983c0-.542.434-.982.969-.982z"
      />
    </svg>
  )
}

// ============================================================
// Feature Icons (Lucide-style, stroke-based)
// ============================================================

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M9.5 12.5L11 14l3.5-3.5" />
    </svg>
  )
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}

function TerminalIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="4 17 10 11 4 5" />
      <line x1="12" y1="19" x2="20" y2="19" />
    </svg>
  )
}

function CpuIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <rect x="9" y="9" width="6" height="6" />
      <line x1="9" y1="1" x2="9" y2="4" />
      <line x1="15" y1="1" x2="15" y2="4" />
      <line x1="9" y1="20" x2="9" y2="23" />
      <line x1="15" y1="20" x2="15" y2="23" />
      <line x1="20" y1="9" x2="23" y2="9" />
      <line x1="20" y1="14" x2="23" y2="14" />
      <line x1="1" y1="9" x2="4" y2="9" />
      <line x1="1" y1="14" x2="4" y2="14" />
    </svg>
  )
}

function ZapIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  )
}

function DatabaseIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </svg>
  )
}

// ============================================================
// Utility Components
// ============================================================

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true)
          setTimeout(() => setCopied(false), 2000)
        })
      }}
      className="flex items-center justify-center rounded-md p-1.5 text-zinc-400 transition-colors hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
      aria-label={copied ? 'Copied' : 'Copy to clipboard'}
    >
      {copied ? (
        <svg
          className="size-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        <svg
          className="size-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
        </svg>
      )}
    </button>
  )
}

function ThemeToggle() {
  const [mounted, setMounted] = useState(false)
  const { setTheme, resolvedTheme } = useTheme()

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <div className="size-9" />
  }

  return (
    <button
      type="button"
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      className="flex size-9 items-center justify-center rounded-lg text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
      aria-label="Toggle theme"
    >
      {resolvedTheme === 'dark' ? (
        <svg
          className="size-[18px]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      ) : (
        <svg
          className="size-[18px]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
        </svg>
      )}
    </button>
  )
}

// ============================================================
// Terminal Block Component
// ============================================================

function TerminalBlock({ title, copyText, children }: { title?: string; copyText: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-100 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex gap-2">
          <span className="size-3 rounded-full bg-zinc-300 dark:bg-zinc-700" />
          <span className="size-3 rounded-full bg-zinc-300 dark:bg-zinc-700" />
          <span className="size-3 rounded-full bg-zinc-300 dark:bg-zinc-700" />
        </div>
        <span className="font-mono text-xs text-zinc-400 dark:text-zinc-500">{title ?? 'terminal'}</span>
        <CopyButton text={copyText} />
      </div>
      <pre className="overflow-x-auto p-5 font-mono text-sm leading-relaxed">
        <code>{children}</code>
      </pre>
    </div>
  )
}

// ============================================================
// Platform Terminal (cycling demo)
// ============================================================

function PlatformTerminal() {
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (paused) return
    const timer = setInterval(() => {
      setActive((prev) => (prev + 1) % TERMINAL_DEMOS.length)
    }, 3500)
    return () => clearInterval(timer)
  }, [paused])

  const demo = TERMINAL_DEMOS[active]

  return (
    <div
      className="overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="border-b border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex gap-2">
            <span className="size-3 rounded-full bg-zinc-300 dark:bg-zinc-700" />
            <span className="size-3 rounded-full bg-zinc-300 dark:bg-zinc-700" />
            <span className="size-3 rounded-full bg-zinc-300 dark:bg-zinc-700" />
          </div>
          <span className="font-mono text-xs text-zinc-400 dark:text-zinc-500">agent-messenger</span>
          <CopyButton
            text={demo.commands
              .filter((c) => 'cmd' in c)
              .map((c) => c.cmd)
              .join('\n')}
          />
        </div>
        <div className="flex gap-0 overflow-x-auto px-2">
          {TERMINAL_DEMOS.map((d, i) => (
            <button
              key={d.platform}
              type="button"
              onClick={() => {
                setActive(i)
                setPaused(true)
              }}
              className={`px-3 py-2 font-mono text-xs whitespace-nowrap transition-colors duration-200 ${
                i === active
                  ? 'border-b-2 border-blue-500 text-zinc-800 dark:text-zinc-200'
                  : 'border-b-2 border-transparent text-zinc-400 hover:text-zinc-600 dark:text-zinc-600 dark:hover:text-zinc-400'
              }`}
            >
              {d.platform}
            </button>
          ))}
        </div>
      </div>

      <pre className="overflow-x-auto p-5 font-mono text-sm leading-relaxed">
        <code>
          {demo.commands.map((line, i) => (
            <span key={`${demo.platform}-${i}`}>
              {'cmd' in line ? (
                <>
                  <span className="text-zinc-400 dark:text-zinc-500">{line.prompt}</span>
                  <span className="text-zinc-800 dark:text-zinc-100">{line.cmd}</span>
                </>
              ) : (
                <>
                  <span className="text-zinc-400 dark:text-zinc-500">{'  '}</span>
                  <span className="text-emerald-600 dark:text-emerald-400">{line.output}</span>
                </>
              )}
              {i < demo.commands.length - 1 ? '\n' : ''}
            </span>
          ))}
        </code>
      </pre>
    </div>
  )
}

// ============================================================
// Data
// ============================================================

const FEATURES = [
  {
    icon: <ShieldIcon className="size-5" />,
    title: 'Auto-Extract Auth',
    description:
      'Reads tokens from Slack, Discord, Teams, KakaoTalk, and Channel Talk desktop apps. Telegram and WhatsApp authenticate with a one-time code — still under a minute.',
  },
  {
    icon: <UserIcon className="size-5" />,
    title: 'Act As Yourself',
    description:
      'Extracts your user session for read/search workflows. Discord personal tokens stay readonly by default; bot CLIs handle write automation.',
  },
  {
    icon: <TerminalIcon className="size-5" />,
    title: 'One Interface',
    description:
      'Same command patterns across 7 platforms: message send, message search, channel list, snapshot. Learn once.',
  },
  {
    icon: <CpuIcon className="size-5" />,
    title: 'Agent-Native Output',
    description:
      'JSON by default for LLM tool use. --pretty for human-readable. Structured output your agent can parse and act on.',
  },
  {
    icon: <ZapIcon className="size-5" />,
    title: 'Token Efficient',
    description: 'CLI, not MCP. One skill file, one shell command per action. No server to run, no tool registration.',
  },
  {
    icon: <DatabaseIcon className="size-5" />,
    title: 'Persistent Memory',
    description: 'Stores workspace IDs, channel mappings, and preferences in ~/.config so your agent never asks twice.',
  },
]

const TERMINAL_DEMOS = [
  {
    platform: 'Slack',
    commands: [
      { prompt: '$ ', cmd: 'agent-slack message search "deployment rollback"' },
      { output: '✓ 7 messages found in #incidents' },
      { prompt: '$ ', cmd: 'agent-slack message replies incidents 1711234567.123456' },
      { output: '✓ 14 replies loaded' },
      { prompt: '$ ', cmd: 'agent-slack message send incidents "Postmortem draft ready"' },
      { output: '✓ Message sent to #incidents' },
    ],
  },
  {
    platform: 'Discord',
    commands: [
      { prompt: '$ ', cmd: 'agent-discord snapshot' },
      { output: '✓ 12 channels, 48 members, recent activity captured' },
      { prompt: '$ ', cmd: 'agent-discord message search "API redesign"' },
      { output: '✓ Found 8 messages' },
      { prompt: '$ ', cmd: 'agent-discordbot message send 1098765432 "Summary posted"' },
      { output: '✓ Bot message sent' },
    ],
  },
  {
    platform: 'Teams',
    commands: [
      { prompt: '$ ', cmd: 'agent-teams channel list 19:abc' },
      { output: '✓ 8 channels in Engineering team' },
      { prompt: '$ ', cmd: 'agent-teams message list 19:abc 19:general --limit 5' },
      { output: '✓ 5 messages loaded' },
      { prompt: '$ ', cmd: 'agent-teams message send 19:abc 19:general "Standup notes"' },
      { output: '✓ Message sent' },
    ],
  },
  {
    platform: 'Telegram',
    commands: [
      { prompt: '$ ', cmd: 'agent-telegram chat search "engineering"' },
      { output: '✓ 3 matching chats found' },
      { prompt: '$ ', cmd: 'agent-telegram message list 12345 --limit 10' },
      { output: '✓ 10 messages loaded' },
      { prompt: '$ ', cmd: 'agent-telegram message send 12345 "CI green, merging now"' },
      { output: '✓ Message sent' },
    ],
  },
  {
    platform: 'WhatsApp',
    commands: [
      { prompt: '$ ', cmd: 'agent-whatsapp chat list --limit 5' },
      { output: '✓ 5 recent chats loaded' },
      { prompt: '$ ', cmd: 'agent-whatsapp message list 1234@s.whatsapp.net' },
      { output: '✓ 10 messages loaded' },
      { prompt: '$ ', cmd: 'agent-whatsapp message react 1234@s.whatsapp.net msg123 👍' },
      { output: '✓ Reaction added' },
    ],
  },
  {
    platform: 'KakaoTalk',
    commands: [
      { prompt: '$ ', cmd: 'agent-kakaotalk chat list' },
      { output: '✓ 12 chat rooms loaded' },
      { prompt: '$ ', cmd: 'agent-kakaotalk message list 9876543210 -n 10' },
      { output: '✓ 10 messages loaded' },
      { prompt: '$ ', cmd: 'agent-kakaotalk message send 9876543210 "Build passed, deploying now"' },
      { output: '✓ Message sent' },
    ],
  },
  {
    platform: 'Channel Talk',
    commands: [
      { prompt: '$ ', cmd: 'agent-channeltalk message search "billing issue"' },
      { output: '✓ 4 messages found across 2 chats' },
      { prompt: '$ ', cmd: 'agent-channeltalk message list user-chat 6812abc' },
      { output: '✓ 15 messages loaded' },
      { prompt: '$ ', cmd: 'agent-channeltalk message send user-chat 6812abc "Refund processed"' },
      { output: '✓ Message sent' },
    ],
  },
]

const PLATFORMS = [
  { name: 'Slack', href: '/docs/cli/slack', Icon: SlackIcon, color: '#4A154B', glowColor: 'rgba(74,21,75,0.4)' },
  {
    name: 'Discord',
    href: '/docs/cli/discord',
    Icon: DiscordIcon,
    color: '#5865F2',
    glowColor: 'rgba(88,101,242,0.4)',
  },
  { name: 'Teams', href: '/docs/cli/teams', Icon: TeamsIcon, color: '#6264A7', glowColor: 'rgba(98,100,167,0.4)' },
  { name: 'Webex', href: '/docs/cli/webex', Icon: WebexIcon, color: '#07C3F2', glowColor: 'rgba(7,195,242,0.4)' },
  {
    name: 'Telegram',
    href: '/docs/cli/telegram',
    Icon: TelegramIcon,
    color: '#2AABEE',
    glowColor: 'rgba(42,171,238,0.4)',
  },
  {
    name: 'WhatsApp',
    href: '/docs/cli/whatsapp',
    Icon: WhatsAppIcon,
    color: '#25D366',
    glowColor: 'rgba(37,211,102,0.4)',
  },
  { name: 'LINE', href: '/docs/cli/line', Icon: LineIcon, color: '#06C755', glowColor: 'rgba(6,199,85,0.4)' },
  { name: 'WeChat', href: '/docs/cli/wechatbot', Icon: WeChatIcon, color: '#07C160', glowColor: 'rgba(7,193,96,0.4)' },
  {
    name: 'Instagram',
    href: '/docs/cli/instagram',
    Icon: InstagramIcon,
    color: '#E4405F',
    glowColor: 'rgba(228,64,95,0.4)',
  },
  {
    name: 'KakaoTalk',
    href: '/docs/cli/kakaotalk',
    Icon: KakaoTalkIcon,
    color: '#FEE500',
    glowColor: 'rgba(254,229,0,0.4)',
  },
  {
    name: 'Channel Talk',
    href: '/docs/cli/channeltalk',
    Icon: ChannelTalkIcon,
    color: '#3B3FE4',
    glowColor: 'rgba(59,63,228,0.4)',
  },
]

const HOW_IT_WORKS = [
  {
    step: 1,
    title: 'Install',
    code: 'npm install -g agent-messenger',
    description:
      'Installs agent-slack, agent-discord, agent-teams, agent-telegram, agent-whatsapp, agent-line, agent-instagram, agent-kakaotalk, agent-channeltalk, plus bot variants.',
  },
  {
    step: 2,
    title: 'Run',
    code: 'agent-slack snapshot --pretty',
    description:
      'Slack, Discord, Teams, KakaoTalk, and Channel Talk tokens are read from your desktop app automatically. Telegram and WhatsApp authenticate with a one-time code.',
  },
  {
    step: 3,
    title: 'Teach Your Agent',
    code: 'npx skills add agent-messenger/agent-messenger',
    description:
      'Install Agent Skills via Skills CLI, Claude Code, OpenCode, or SkillPad — your agent learns every command and starts messaging on its own.',
  },
]

const USE_CASES = [
  'Read the #incident-api-outage thread in Slack and write a postmortem draft',
  'Post the deployment changelog to #releases in Slack and #announcements in Discord',
  'Search the Teams #design channel for the latest discussion about the new onboarding flow',
  'Check my unread Slack messages right now and draft replies for anything urgent',
  'Look up who reacted to my last message in #general on Discord and what they said after',
  "Summarize today's WhatsApp group chat and send the summary to #standup in Slack",
]

const CAPABILITIES: {
  feature: string
  slack: boolean
  discord: boolean
  teams: boolean
  webex: boolean
  telegram: boolean
  whatsapp: boolean
  line: boolean
  wechat: boolean
  instagram: boolean
  kakaotalk: boolean
  channeltalk: boolean
}[] = [
  {
    feature: 'Zero-config credentials',
    slack: true,
    discord: true,
    teams: true,
    webex: true,
    telegram: false,
    whatsapp: false,
    line: false,
    wechat: false,
    instagram: false,
    kakaotalk: true,
    channeltalk: true,
  },
  {
    feature: 'Send & list messages',
    slack: true,
    discord: true,
    teams: true,
    webex: true,
    telegram: true,
    whatsapp: true,
    line: true,
    wechat: false,
    instagram: true,
    kakaotalk: true,
    channeltalk: true,
  },
  {
    feature: 'Search messages',
    slack: true,
    discord: true,
    teams: false,
    webex: false,
    telegram: false,
    whatsapp: true,
    line: false,
    wechat: false,
    instagram: true,
    kakaotalk: false,
    channeltalk: true,
  },
  {
    feature: 'Threads',
    slack: true,
    discord: true,
    teams: false,
    webex: false,
    telegram: false,
    whatsapp: false,
    line: false,
    wechat: false,
    instagram: false,
    kakaotalk: false,
    channeltalk: false,
  },
  {
    feature: 'Reactions',
    slack: true,
    discord: true,
    teams: true,
    webex: false,
    telegram: false,
    whatsapp: true,
    line: false,
    wechat: false,
    instagram: false,
    kakaotalk: false,
    channeltalk: false,
  },
  {
    feature: 'File upload & download',
    slack: true,
    discord: true,
    teams: true,
    webex: false,
    telegram: false,
    whatsapp: false,
    line: false,
    wechat: false,
    instagram: false,
    kakaotalk: false,
    channeltalk: false,
  },
  {
    feature: 'Workspace snapshot',
    slack: true,
    discord: true,
    teams: true,
    webex: true,
    telegram: false,
    whatsapp: false,
    line: false,
    wechat: false,
    instagram: false,
    kakaotalk: false,
    channeltalk: true,
  },
  {
    feature: 'Multi-account',
    slack: true,
    discord: true,
    teams: true,
    webex: false,
    telegram: true,
    whatsapp: true,
    line: true,
    wechat: true,
    instagram: true,
    kakaotalk: false,
    channeltalk: true,
  },
  {
    feature: 'Bot CLI available',
    slack: true,
    discord: true,
    teams: false,
    webex: false,
    telegram: false,
    whatsapp: true,
    line: false,
    wechat: true,
    instagram: false,
    kakaotalk: false,
    channeltalk: true,
  },
  {
    feature: 'Real-time events (SDK)',
    slack: true,
    discord: false,
    teams: false,
    webex: false,
    telegram: false,
    whatsapp: false,
    line: true,
    wechat: false,
    instagram: true,
    kakaotalk: false,
    channeltalk: false,
  },
]

const PLATFORM_COLUMNS = [
  'Slack',
  'Discord',
  'Teams',
  'Webex',
  'Telegram',
  'WhatsApp',
  'LINE',
  'WeChat',
  'Instagram',
  'KakaoTalk',
  'Ch. Talk',
] as const
const PLATFORM_KEYS = [
  'slack',
  'discord',
  'teams',
  'webex',
  'telegram',
  'whatsapp',
  'line',
  'wechat',
  'instagram',
  'kakaotalk',
  'channeltalk',
] as const

// ============================================================
// Page Component
// ============================================================

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      {/* ================================================================
          AMBIENT GLOW BACKGROUND
          ================================================================ */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-[20%] left-1/2 h-[900px] w-[900px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(139,92,246,0.15)_0%,rgba(59,130,246,0.08)_40%,transparent_70%)] opacity-[0.03] dark:opacity-[0.08]" />
        <div className="absolute -right-[5%] -bottom-[10%] h-[600px] w-[600px] rounded-full bg-[radial-gradient(circle,rgba(59,130,246,0.5)_0%,transparent_60%)] opacity-[0.02] dark:opacity-[0.05]" />
      </div>

      {/* ================================================================
          1. HEADER / NAV (Glass)
          ================================================================ */}
      <nav className="fixed inset-x-0 top-0 z-50 flex h-16 items-center justify-between border-b border-zinc-200/40 bg-white/80 px-4 backdrop-blur-xl sm:px-6 dark:border-white/[0.06] dark:bg-zinc-950/80">
        <Link href="/" className="font-mono text-sm font-semibold tracking-wide text-zinc-900 dark:text-zinc-100">
          agent-messenger
        </Link>
        <div className="flex items-center gap-1 sm:gap-2">
          <Link
            href="/docs"
            className="rounded-lg px-3 py-2 font-mono text-xs text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            docs
          </Link>
          <a
            href="https://github.com/agent-messenger/agent-messenger"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg px-3 py-2 font-mono text-xs text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            github
          </a>
          <ThemeToggle />
        </div>
      </nav>

      {/* ================================================================
          2. HERO (Gradient text + glass CTAs)
          ================================================================ */}
      <section className="relative z-10 px-4 pt-36 pb-20 sm:px-6 sm:pt-44 sm:pb-24">
        <div className="mx-auto max-w-4xl text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200/40 bg-zinc-50/80 px-4 py-1.5 font-mono text-xs tracking-wide text-zinc-600 backdrop-blur-sm dark:border-white/[0.06] dark:bg-white/[0.03] dark:text-zinc-400">
            <span className="size-2 animate-pulse rounded-full bg-emerald-500" />
            open source
          </div>

          {/* Headline with gradient text */}
          <h1 className="mt-8 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            <span className="bg-gradient-to-br from-zinc-900 to-zinc-500 bg-clip-text text-transparent dark:from-white dark:to-zinc-400">
              Your agent messages as you — not as a bot
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
            One CLI for Slack, Discord, Teams, Webex, Telegram, WhatsApp, LINE, WeChat, Instagram, KakaoTalk, and
            Channel Talk. Credentials extracted from desktop apps or authenticated in seconds — no API keys, no admin
            approval.
          </p>

          {/* CTAs with glass treatment in dark mode */}
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/docs"
              className="inline-flex items-center justify-center rounded-xl bg-zinc-900 px-6 py-3 text-sm font-medium text-white transition-all duration-300 hover:bg-zinc-800 dark:border dark:border-white/15 dark:bg-white/10 dark:backdrop-blur-xl dark:hover:bg-white/15 dark:hover:shadow-[0_0_30px_-5px_rgba(139,92,246,0.2)]"
            >
              Get Started
            </Link>
            <a
              href="https://github.com/agent-messenger/agent-messenger"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-xl border border-zinc-300 px-6 py-3 text-sm font-medium text-zinc-700 transition-all duration-300 hover:bg-zinc-50 dark:border-white/[0.06] dark:text-zinc-300 dark:hover:border-white/15 dark:hover:bg-white/[0.05]"
            >
              View on GitHub
            </a>
          </div>

          <div className="mx-auto mt-14 max-w-2xl text-left">
            <PlatformTerminal />
          </div>
        </div>
      </section>

      {/* ================================================================
          3. TRUST / PLATFORM BAR (Platform pills with brand glow)
          ================================================================ */}
      <section className="relative z-10 border-y border-zinc-100/50 px-4 py-16 sm:px-6 dark:border-white/[0.04]">
        <div className="mx-auto max-w-5xl text-center">
          <p className="font-mono text-xs tracking-widest text-zinc-400 uppercase dark:text-zinc-600">
            Works with the platforms your team already uses
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {PLATFORMS.map((p) => (
              <Link
                key={p.name}
                href={p.href}
                className="group relative flex items-center gap-3 rounded-full border border-zinc-200/40 bg-white/70 px-5 py-3 backdrop-blur-xl transition-all duration-300 hover:border-zinc-300/60 dark:border-white/[0.06] dark:bg-white/[0.04] dark:hover:border-white/15"
              >
                {/* Brand glow on hover */}
                <div
                  className="absolute inset-0 -z-10 rounded-full opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                  style={{ boxShadow: `0 0 40px -10px ${p.glowColor}` }}
                />
                <div className="size-6">
                  <p.Icon />
                </div>
                <span className="font-mono text-xs font-medium text-zinc-600 transition-colors duration-300 group-hover:text-zinc-900 dark:text-zinc-400 dark:group-hover:text-zinc-200">
                  {p.name}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================
          4. WHY AGENT MESSENGER? (Glass cards)
          ================================================================ */}
      <section className="relative z-10 px-4 py-20 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <p className="font-mono text-xs font-medium tracking-widest text-blue-600 uppercase dark:text-blue-400">
              Why Agent Messenger?
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              You shouldn&apos;t need a bot token to send a message
            </h2>
          </div>

          <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* The Problem */}
            <div className="rounded-2xl border border-zinc-200/40 bg-white/60 p-8 backdrop-blur-xl transition-all duration-300 hover:border-zinc-300/60 hover:shadow-lg dark:border-white/[0.06] dark:bg-white/[0.03] dark:hover:border-white/15 dark:hover:shadow-[0_0_40px_-15px_rgba(139,92,246,0.15)]">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-red-50 px-3 py-1 font-mono text-xs font-medium tracking-wider text-red-600 uppercase dark:bg-red-950/50 dark:text-red-400">
                <span className="size-1.5 rounded-full bg-red-500" />
                Problem
              </div>
              <p className="leading-relaxed text-zinc-600 dark:text-zinc-400">
                Every platform gates API access behind OAuth apps that need admin approval — days of waiting just to
                send a message. And even then, your agent is a{' '}
                <strong className="text-zinc-900 dark:text-zinc-100">bot</strong>, not you. Different name, different
                permissions, different context.
              </p>
            </div>

            {/* The Solution */}
            <div className="rounded-2xl border border-zinc-200/40 bg-white/60 p-8 backdrop-blur-xl transition-all duration-300 hover:border-zinc-300/60 hover:shadow-lg dark:border-white/[0.06] dark:bg-white/[0.03] dark:hover:border-white/15 dark:hover:shadow-[0_0_40px_-15px_rgba(139,92,246,0.15)]">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 font-mono text-xs font-medium tracking-wider text-emerald-600 uppercase dark:bg-emerald-950/50 dark:text-emerald-400">
                <span className="size-1.5 rounded-full bg-emerald-500" />
                Solution
              </div>
              <p className="leading-relaxed text-zinc-600 dark:text-zinc-400">
                Agent Messenger reads session tokens from your Slack, Discord, Teams, or KakaoTalk desktop app — zero
                config. Telegram, WhatsApp, LINE, and Instagram authenticate with a one-time code or credentials. Either
                way, your agent operates <strong className="text-zinc-900 dark:text-zinc-100">as you</strong> — same
                name, same permissions, same context.
              </p>
            </div>
          </div>

          <p className="mt-6 text-center text-sm text-zinc-400 dark:text-zinc-600">
            Credentials are stored locally in ~/.config/agent-messenger/ with restricted permissions. Nothing is sent to
            third-party servers.
          </p>
        </div>
      </section>

      {/* ================================================================
          5. FEATURES GRID (Glass cards with hover glow)
          ================================================================ */}
      <section className="relative z-10 border-t border-zinc-100/50 px-4 py-20 sm:px-6 sm:py-24 dark:border-white/[0.04]">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <p className="font-mono text-xs font-medium tracking-widest text-blue-600 uppercase dark:text-blue-400">
              Features
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Built for agents, not humans</h2>
          </div>

          <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="group rounded-2xl border border-zinc-200/40 bg-white/60 p-6 backdrop-blur-xl transition-all duration-300 hover:border-zinc-300/60 hover:shadow-lg dark:border-white/[0.06] dark:bg-white/[0.03] dark:hover:border-white/15 dark:hover:shadow-[0_0_40px_-15px_rgba(139,92,246,0.15)]"
              >
                <div className="flex size-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 transition-colors duration-300 dark:bg-blue-950/50 dark:text-blue-400">
                  {f.icon}
                </div>
                <h3 className="mt-4 font-mono text-sm font-semibold text-zinc-900 dark:text-zinc-100">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================
          6. HOW IT WORKS (Vertical timeline with glass nodes + cards)
          ================================================================ */}
      <section className="relative z-10 border-t border-zinc-100/50 px-4 py-20 sm:px-6 sm:py-24 dark:border-white/[0.04]">
        <div className="mx-auto max-w-3xl">
          <div className="text-center">
            <p className="font-mono text-xs font-medium tracking-widest text-blue-600 uppercase dark:text-blue-400">
              How It Works
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Running in under a minute</h2>
          </div>

          {/* Vertical Timeline */}
          <div className="relative mt-14">
            {/* Gradient Timeline Line */}
            <div className="absolute top-8 bottom-8 left-[27px] w-px bg-gradient-to-b from-violet-300/50 via-blue-300/30 to-transparent dark:from-violet-500/30 dark:via-blue-500/20 dark:to-transparent" />

            <div className="space-y-8">
              {HOW_IT_WORKS.map((step) => (
                <div key={step.step} className="relative flex gap-6">
                  {/* Numbered Node */}
                  <div className="relative z-10 flex-shrink-0">
                    <div className="flex size-[54px] items-center justify-center rounded-2xl border border-zinc-200/60 bg-white font-mono text-xs font-bold text-zinc-400 shadow-sm backdrop-blur-xl transition-all duration-300 dark:border-white/10 dark:bg-white/[0.05] dark:text-white/50 dark:shadow-none">
                      {String(step.step).padStart(2, '0')}
                    </div>
                  </div>

                  {/* Content Card */}
                  <div className="flex-1 rounded-2xl border border-zinc-200/40 bg-white/60 p-5 backdrop-blur-xl transition-all duration-300 hover:border-zinc-300/60 dark:border-white/[0.06] dark:bg-white/[0.03] dark:hover:border-white/15">
                    <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{step.title}</h3>
                    <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{step.description}</p>
                    <code className="mt-3 inline-block rounded-lg border border-zinc-100 bg-zinc-50 px-3 py-1.5 font-mono text-xs text-blue-600 dark:border-white/[0.04] dark:bg-white/[0.04] dark:text-blue-400">
                      {step.code}
                    </code>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================
          7. USE CASES (Quote blocks with glass background)
          ================================================================ */}
      <section className="relative z-10 border-t border-zinc-100/50 px-4 py-20 sm:px-6 sm:py-24 dark:border-white/[0.04]">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <p className="font-mono text-xs font-medium tracking-widest text-blue-600 uppercase dark:text-blue-400">
              Use Cases
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">What agents build with this</h2>
          </div>

          <div className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-2">
            {USE_CASES.map((uc) => (
              <div
                key={uc}
                className="rounded-r-xl border-l-4 border-blue-500 bg-white/60 px-5 py-4 backdrop-blur-xl transition-all duration-300 dark:bg-white/[0.02]"
              >
                <p className="text-sm leading-relaxed text-zinc-600 italic dark:text-zinc-400">&ldquo;{uc}&rdquo;</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================================================
          8. WHY CLI, NOT MCP? (Glass comparison cards)
          ================================================================ */}
      <section className="relative z-10 border-t border-zinc-100/50 px-4 py-20 sm:px-6 sm:py-24 dark:border-white/[0.04]">
        <div className="mx-auto max-w-4xl">
          <div className="text-center">
            <p className="font-mono text-xs font-medium tracking-widest text-blue-600 uppercase dark:text-blue-400">
              Philosophy
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Why CLI, not MCP?</h2>
          </div>

          <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* MCP */}
            <div className="rounded-2xl border border-zinc-200/40 bg-white/60 p-8 backdrop-blur-xl transition-all duration-300 dark:border-white/[0.06] dark:bg-white/[0.03]">
              <span className="inline-block rounded-md bg-zinc-100 px-3 py-1 font-mono text-sm font-semibold text-zinc-500 dark:bg-white/[0.06] dark:text-zinc-400">
                MCP
              </span>
              <ul className="mt-6 space-y-4">
                {[
                  'Requires a running server process per integration',
                  'Registers all tools upfront — larger context window footprint',
                  'Additional protocol layer between agent and action',
                ].map((point) => (
                  <li key={point} className="flex items-start gap-3 text-sm text-zinc-500 dark:text-zinc-500">
                    <span className="mt-0.5 text-red-400 dark:text-red-500">✕</span>
                    {point}
                  </li>
                ))}
              </ul>
            </div>

            {/* CLI */}
            <div className="rounded-2xl border border-zinc-200/40 bg-white/60 p-8 backdrop-blur-xl transition-all duration-300 hover:border-zinc-300/60 hover:shadow-lg dark:border-white/[0.06] dark:bg-white/[0.03] dark:hover:border-white/15 dark:hover:shadow-[0_0_40px_-15px_rgba(139,92,246,0.15)]">
              <span className="inline-block rounded-md bg-blue-50 px-3 py-1 font-mono text-sm font-semibold text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
                Agent Skills + CLI
              </span>
              <ul className="mt-6 space-y-4">
                {[
                  'Agent learns one skill, calls one CLI command',
                  'Minimal token footprint — only the tool it needs',
                  'Structured JSON output, compact session references',
                ].map((point) => (
                  <li key={point} className="flex items-start gap-3 text-sm text-zinc-700 dark:text-zinc-300">
                    <span className="mt-0.5 text-emerald-500">✓</span>
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================
          9. PLATFORM FEATURE MATRIX (Glass table)
          ================================================================ */}
      <section className="relative z-10 border-t border-zinc-100/50 px-4 py-20 sm:px-6 sm:py-24 dark:border-white/[0.04]">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <p className="font-mono text-xs font-medium tracking-widest text-blue-600 uppercase dark:text-blue-400">
              Compatibility
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Platform capabilities</h2>
          </div>

          <div className="mt-14 overflow-x-auto rounded-2xl border border-zinc-200/40 bg-white/50 backdrop-blur-xl dark:border-white/[0.06] dark:bg-white/[0.02]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200/40 dark:border-white/[0.06]">
                  <th className="px-4 py-3 text-left font-mono text-xs font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-500">
                    Feature
                  </th>
                  {PLATFORM_COLUMNS.map((col) => (
                    <th
                      key={col}
                      className="px-4 py-3 text-center font-mono text-xs font-semibold tracking-wide whitespace-nowrap text-zinc-500 uppercase dark:text-zinc-500"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {CAPABILITIES.map((row, i) => (
                  <tr
                    key={row.feature}
                    className={i % 2 === 0 ? 'bg-white/30 dark:bg-white/[0.01]' : 'bg-zinc-50/30 dark:bg-transparent'}
                  >
                    <td className="px-4 py-3 font-medium whitespace-nowrap text-zinc-700 dark:text-zinc-300">
                      {row.feature}
                    </td>
                    {PLATFORM_KEYS.map((key) => (
                      <td key={key} className="px-4 py-3 text-center">
                        {row[key] ? (
                          <span className="font-mono text-emerald-500">✓</span>
                        ) : (
                          <span className="text-zinc-300 dark:text-zinc-700">—</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
            Slack goes deepest — scheduled messages, ephemeral sends, file downloads, real-time events SDK, activity
            feed, drafts, saved items, reminders, pins, and bookmarks.
          </p>
        </div>
      </section>

      {/* ================================================================
          10. INSTALL CTA (Glass card with glow)
          ================================================================ */}

      <section className="relative z-10 border-t border-zinc-100/50 px-4 py-20 sm:px-6 sm:py-24 dark:border-white/[0.04]">
        <div className="mx-auto max-w-2xl">
          <div className="relative overflow-hidden rounded-3xl border border-zinc-200/40 bg-white/60 p-10 text-center backdrop-blur-xl dark:border-white/[0.08] dark:bg-white/[0.03]">
            {/* Subtle CTA glow behind */}
            <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,rgba(139,92,246,0.08)_0%,transparent_60%)] opacity-0 dark:opacity-100" />

            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Install once. Message everywhere.</h2>

            <div className="mx-auto mt-10 max-w-lg text-left">
              <TerminalBlock copyText="npm install -g agent-messenger">
                <span className="text-zinc-400 dark:text-zinc-500">$ </span>
                <span className="text-zinc-800 dark:text-zinc-100">npm install -g agent-messenger</span>
              </TerminalBlock>
            </div>

            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/docs"
                className="inline-flex items-center justify-center rounded-xl bg-zinc-900 px-6 py-3 text-sm font-medium text-white transition-all duration-300 hover:bg-zinc-800 dark:border dark:border-white/15 dark:bg-white/10 dark:backdrop-blur-xl dark:hover:bg-white/15"
              >
                Read the Docs
              </Link>
              <a
                href="https://github.com/agent-messenger/agent-messenger"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-xl border border-zinc-300 px-6 py-3 text-sm font-medium text-zinc-700 transition-all duration-300 hover:bg-white dark:border-white/[0.06] dark:text-zinc-300 dark:hover:border-white/15 dark:hover:bg-white/[0.05]"
              >
                View on GitHub
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ================================================================
          11. FOOTER (Glass top border)
          ================================================================ */}
      <footer className="relative z-10 border-t border-zinc-200/40 px-4 py-12 dark:border-white/[0.06]">
        <div className="mx-auto max-w-5xl text-center">
          <div className="flex items-center justify-center gap-6 font-mono text-xs text-zinc-400 dark:text-zinc-600">
            <Link href="/docs" className="transition-colors duration-300 hover:text-zinc-700 dark:hover:text-zinc-300">
              docs
            </Link>
            <a
              href="https://github.com/agent-messenger/agent-messenger"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors duration-300 hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              github
            </a>
            <a
              href="https://www.npmjs.com/package/agent-messenger"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors duration-300 hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              npm
            </a>
          </div>
          <p className="mt-6 font-mono text-xs text-zinc-400 dark:text-zinc-600">
            &copy; {new Date().getFullYear()} agent-messenger · MIT
          </p>
        </div>
      </footer>
    </div>
  )
}
