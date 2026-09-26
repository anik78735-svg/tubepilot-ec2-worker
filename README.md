# TubePilot EC2 Worker

Ye code AWS EC2 server (`tubepilot-live-server`) par chalega. Iska kaam hai
FFmpeg ko control karna — video ko loop karke YouTube RTMP par bhejna.

## EC2 Par Setup Karne Ke Steps

1. Is poore `ec2-worker` folder ko apne EC2 server ke
   `/home/ubuntu/tubepilot-live/` folder mein daalo (WinSCP/FileZilla se ya
   `scp` command se, ya GitHub repo bana kar `git clone` se).

2. Video files rakhne ke liye folder banao:
   ```bash
   mkdir -p /home/ubuntu/tubepilot-live/videos
   ```

3. Dependencies install karo:
   ```bash
   cd /home/ubuntu/tubepilot-live
   npm install
   ```

4. `.env.example` ko copy karke `.env` banao aur values bharo:
   ```bash
   cp .env.example .env
   nano .env
   ```
   - `WORKER_SECRET_KEY` mein koi bhi lamba random string daalo
     (jaise: `tp_9x8K2mZq7Lw4Rv1Ns6Bx3Cy0Ah5Fg`). Yahi key Render backend
     mein bhi daalni hogi — dono jagah SAME honi chahiye.

5. Server start karo:
   ```bash
   node index.js
   ```
   Agar sab sahi hai to ye dikhega:
   `TubePilot EC2 worker chal raha hai port 4000 par`

6. **Production ke liye** (taaki server restart/crash hone par bhi ye
   apne aap chalta rahe), `pm2` use karo — ye baad mein set karenge jab
   testing shuru karoge.

## Zaroori Reminder

- Security Group mein port `1935` (RTMP outgoing ke liye) already khula
  hona chahiye.
- Is worker ka apna API port (`4000`) sirf Render backend ke liye hai —
  isko public internet ke liye open mat karna, sirf Render ka IP allow
  karna best rahega (abhi ke liye secret key hi kaafi hai).
