// Security utilities for blocking bots and unauthorized access

export function isBot(userAgent: string | null): boolean {
  if (!userAgent) return true // Block requests without user agent
  
  const botPatterns = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i,
    /googlebot/i,
    /bingbot/i,
    /slurp/i,
    /duckduckbot/i,
    /baiduspider/i,
    /yandexbot/i,
    /sogou/i,
    /exabot/i,
    /facebot/i,
    /ia_archiver/i,
    /curl/i,
    /wget/i,
    /python/i,
    /java/i,
    /go-http/i,
    /httpie/i,
    /postman/i,
    /insomnia/i,
    /restclient/i,
    /http/i,
    /scrapy/i,
    /beautifulsoup/i,
    /mechanize/i,
    /phantom/i,
    /headless/i,
    /selenium/i,
    /puppeteer/i,
    /playwright/i,
    /webdriver/i,
  ]
  
  return botPatterns.some((pattern) => pattern.test(userAgent))
}

export function blockBotResponse() {
  return new Response('Access Denied', { 
    status: 403,
    headers: {
      'X-Robots-Tag': 'noindex, nofollow',
    },
  })
}

