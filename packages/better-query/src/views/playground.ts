export function getPlaygroundHTML(appName: string = "ClickNVape"): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
    <title>API de ${appName}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta charset="utf-8">
    <meta name="description" content="L'API de ${appName} offre un accès complet aux fonctionnalités de la plateforme, permettant une intégration simple et efficace de nos services.">
    <meta property="og:type" content="website">
    <meta property="og:title" content="API de ${appName}">
    <meta property="og:description" content="L'API de ${appName} offre un accès complet aux fonctionnalités de la plateforme, permettant une intégration simple et efficace de nos services.">
    <meta property="twitter:card" content="summary_large_image">
    <meta property="twitter:title" content="API de ${appName}">
    <meta property="twitter:description" content="L'API de ${appName} offre un accès complet aux fonctionnalités de la plateforme, permettant une intégration simple et efficace de nos services.">
    
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous">
    <link href="https://fonts.googleapis.com/css2?family=Lexend:wght@100..900&family=Outfit:wght@100..900&display=swap" rel="stylesheet">
    
    <script src="https://cdn.tailwindcss.com"></script>
    
    <style>
        * { 
            font-family: 'Lexend', sans-serif; 
        }
        
        @keyframes borderAnimation {
            0%, 100% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
        }
        
        @keyframes meteorAnimation {
            0% { transform: rotate(215deg) translateX(0); opacity: 1; }
            70% { opacity: 1; }
            100% { transform: rotate(215deg) translateX(-500px); opacity: 0; }
        }
        
        .meteor {
            animation: meteorAnimation 3s linear infinite;
            position: absolute;
            height: 4px;
            width: 4px;
            border-radius: 9999px;
            box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.1);
            transform: rotate(215deg);
            top: 0;
        }
        
        .meteor::before {
            content: '';
            position: absolute;
            top: 50%;
            transform: translateY(-50%);
            width: 50px;
            height: 1px;
            background: linear-gradient(90deg, #64748b, transparent);
        }
        
        .meteor:nth-child(1) { left: -234px; animation-delay: 0.3s; animation-duration: 7s; }
        .meteor:nth-child(2) { left: 156px; animation-delay: 0.7s; animation-duration: 4s; }
        .meteor:nth-child(3) { left: -89px; animation-delay: 0.2s; animation-duration: 9s; }
        .meteor:nth-child(4) { left: 267px; animation-delay: 0.5s; animation-duration: 3s; }
        .meteor:nth-child(5) { left: -178px; animation-delay: 0.8s; animation-duration: 6s; }
        .meteor:nth-child(6) { left: 45px; animation-delay: 0.4s; animation-duration: 8s; }
        .meteor:nth-child(7) { left: -312px; animation-delay: 0.6s; animation-duration: 5s; }
        .meteor:nth-child(8) { left: 123px; animation-delay: 0.2s; animation-duration: 7s; }
        .meteor:nth-child(9) { left: -67px; animation-delay: 0.9s; animation-duration: 4s; }
        .meteor:nth-child(10) { left: 298px; animation-delay: 0.3s; animation-duration: 6s; }
        .meteor:nth-child(11) { left: -145px; animation-delay: 0.7s; animation-duration: 8s; }
        .meteor:nth-child(12) { left: 78px; animation-delay: 0.5s; animation-duration: 3s; }
        .meteor:nth-child(13) { left: -223px; animation-delay: 0.4s; animation-duration: 9s; }
        .meteor:nth-child(14) { left: 189px; animation-delay: 0.6s; animation-duration: 5s; }
        .meteor:nth-child(15) { left: -101px; animation-delay: 0.8s; animation-duration: 7s; }
    </style>
</head>

<body class="bg-black mx-auto md:min-h-screen max-w-screen-lg flex flex-col">
    <main class="mx-auto my-auto flex flex-col space-y-8 px-4 pb-8 md:py-10 relative overflow-y-hidden overflow-x-hidden">
        
        <!-- Meteors -->
        <span class="meteor"></span>
        <span class="meteor"></span>
        <span class="meteor"></span>
        <span class="meteor"></span>
        <span class="meteor"></span>
        <span class="meteor"></span>
        <span class="meteor"></span>
        <span class="meteor"></span>
        <span class="meteor"></span>
        <span class="meteor"></span>
        <span class="meteor"></span>
        <span class="meteor"></span>
        <span class="meteor"></span>
        <span class="meteor"></span>
        <span class="meteor"></span>

        <!-- Header -->
        <div class="flex flex-row items-center space-x-4 ml-6">
            <svg class="sm:h-12 sm:w-12 h-8 w-8 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                <path fill="#7EDAFD" d="M3.172 3.464C2 4.93 2 7.286 2 12c0 4.714 0 7.071 1.172 8.535C4.343 22 6.229 22 10 22h3.376A4.25 4.25 0 0 1 17 16.007V12.25a2.25 2.25 0 0 1 4.5 0a.75.75 0 0 0 .5.707V12c0-4.714 0-7.071-1.172-8.536C19.657 2 17.771 2 14 2h-4C6.229 2 4.343 2 3.172 3.464" opacity=".5"/>
            </svg>
            <p class="text-2xl md:text-4xl text-transparent font-bold leading-none bg-clip-text bg-gradient-to-r from-[#7EDAFD] to-blue-600">
                API de ${appName}
            </p>
        </div>

        <!-- Content Grid -->
        <div class="grid grid-cols-1 sm:grid-cols-4 lg:grid-cols-4 xl:grid-cols-8 gap-2 sm:gap-0 relative grid-flow-row">
            
            <!-- Documentation Card -->
            <a target="_blank" class="p-4 sm:p-8 hover:bg-opacity-5 hover:bg-white rounded-lg duration-100 sm:col-span-4" href="/docs">
                <div class="flex flex-col">
                    <span class="text-xs uppercase bg-opacity-15 rounded text-center max-w-fit px-2 py-1 font-bold tracking-wide bg-blue-500 text-blue-500">
                        ${appName}
                    </span>
                    <span class="text-neutral-200 font-bold text-lg sm:text-xl md:text-2xl mt-2">
                        API de ${appName}
                    </span>
                    <div class="text-neutral-500 mt-2">
                        Découvrez la documentation pour apprendre à intégrer et tirer parti des services proposés.
                    </div>
                </div>
            </a>

            <!-- Authentication Card -->
            <a target="_blank" class="p-4 sm:p-8 hover:bg-opacity-5 hover:bg-white rounded-lg duration-100 sm:col-span-4" href="/api/auth/reference">
                <div class="flex flex-col">
                    <span class="text-xs uppercase bg-opacity-15 rounded text-center max-w-fit px-2 py-1 font-bold tracking-wide bg-green-500 text-green-500">
                        Authentification
                    </span>
                    <span class="text-neutral-200 font-bold text-lg sm:text-xl md:text-2xl mt-2">
                        Gestion des utilisateurs
                    </span>
                    <div class="text-neutral-500 mt-2">
                        Découvrez notre système d'authentification avec des guides d'implémentation et une référence API complète.
                    </div>
                </div>
            </a>

        </div>
    </main>
</body>
</html>`;
}
