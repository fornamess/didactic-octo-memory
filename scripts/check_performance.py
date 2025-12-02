#!/usr/bin/env python3
"""
Скрипт для проверки производительности и метрик сайта
Проверяет доступность, скорость загрузки, SEO метаданные, размеры страниц и т.д.
"""

import argparse
import json
import sys
import time
from datetime import datetime
from typing import Dict, List, Optional, Tuple
from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup


# Цвета для вывода в консоль
class Colors:
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    RESET = '\033[0m'
    BOLD = '\033[1m'

class PerformanceChecker:
    def __init__(self, base_url: str, timeout: int = 30):
        self.base_url = base_url.rstrip('/')
        self.timeout = timeout
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        })
        self.results = {}

    def check_url(self, url: str, measure_ttfb: bool = False) -> Tuple[bool, Optional[requests.Response], Optional[float], Optional[float]]:
        """Проверяет доступность URL"""
        try:
            start_time = time.time()
            response = self.session.get(url, timeout=self.timeout, allow_redirects=True, stream=True)
            
            # Измеряем TTFB (Time To First Byte)
            ttfb = None
            if measure_ttfb:
                ttfb = time.time() - start_time
                # Читаем весь контент
                response.content
            
            load_time = time.time() - start_time
            return True, response, load_time, ttfb
        except requests.exceptions.RequestException as e:
            return False, None, None, None

    def check_page_performance(self, url: str) -> Dict:
        """Проверяет производительность страницы"""
        print(f"\n{Colors.CYAN}🔍 Проверка: {url}{Colors.RESET}")

        success, response, load_time, ttfb = self.check_url(url, measure_ttfb=True)

        if not success or response is None:
            return {
                'url': url,
                'status': 'error',
                'error': 'Не удалось загрузить страницу'
            }

        # Читаем контент если еще не прочитан
        if not hasattr(response, '_content') or response._content is None:
            response.content

        result = {
            'url': url,
            'status_code': response.status_code,
            'load_time': round(load_time, 3),
            'ttfb': round(ttfb, 3) if ttfb else None,
            'size': len(response.content),
            'size_kb': round(len(response.content) / 1024, 2),
            'headers': dict(response.headers),
            'redirects': len(response.history),
        }

        # Проверка статуса
        if response.status_code == 200:
            result['status'] = 'ok'
            print(f"{Colors.GREEN}✓ Статус: {response.status_code}{Colors.RESET}")
        else:
            result['status'] = 'warning'
            print(f"{Colors.YELLOW}⚠ Статус: {response.status_code}{Colors.RESET}")

        # Проверка TTFB
        if ttfb:
            if ttfb < 0.2:
                print(f"{Colors.GREEN}✓ TTFB: {ttfb:.3f}s (отлично){Colors.RESET}")
            elif ttfb < 0.6:
                print(f"{Colors.YELLOW}⚠ TTFB: {ttfb:.3f}s (хорошо){Colors.RESET}")
            else:
                print(f"{Colors.RED}✗ TTFB: {ttfb:.3f}s (медленно - возможно холодный старт){Colors.RESET}")

        # Проверка времени загрузки
        if load_time < 1.0:
            print(f"{Colors.GREEN}✓ Время загрузки: {load_time:.3f}s (отлично){Colors.RESET}")
        elif load_time < 2.0:
            print(f"{Colors.YELLOW}⚠ Время загрузки: {load_time:.3f}s (хорошо){Colors.RESET}")
        elif load_time < 5.0:
            print(f"{Colors.YELLOW}⚠ Время загрузки: {load_time:.3f}s (приемлемо){Colors.RESET}")
        else:
            print(f"{Colors.RED}✗ Время загрузки: {load_time:.3f}s (очень медленно!){Colors.RESET}")
            if ttfb and ttfb > 5.0:
                print(f"  {Colors.YELLOW}💡 Возможно холодный старт сервера или медленный ответ сервера{Colors.RESET}")

        # Проверка размера
        size_mb = result['size_kb'] / 1024
        if size_mb < 0.5:
            print(f"{Colors.GREEN}✓ Размер: {result['size_kb']} KB (отлично){Colors.RESET}")
        elif size_mb < 1.0:
            print(f"{Colors.YELLOW}⚠ Размер: {result['size_kb']} KB (хорошо){Colors.RESET}")
        else:
            print(f"{Colors.RED}✗ Размер: {result['size_kb']} KB (большой){Colors.RESET}")

        # Парсинг HTML для дополнительных проверок
        try:
            soup = BeautifulSoup(response.text, 'html.parser')
            result['seo'] = self.check_seo(soup, url)
            result['performance_hints'] = self.check_performance_hints(soup, response)
            result['resources'] = self.check_resources(soup, url)
        except Exception as e:
            result['parse_error'] = str(e)

        return result

    def check_seo(self, soup: BeautifulSoup, url: str) -> Dict:
        """Проверяет SEO метаданные"""
        seo = {
            'title': None,
            'description': None,
            'keywords': None,
            'og_title': None,
            'og_description': None,
            'og_image': None,
            'canonical': None,
            'robots': None,
            'issues': []
        }

        # Title
        title_tag = soup.find('title')
        if title_tag:
            seo['title'] = title_tag.get_text().strip()
            if len(seo['title']) < 30:
                seo['issues'].append('Title слишком короткий (< 30 символов)')
            elif len(seo['title']) > 60:
                seo['issues'].append('Title слишком длинный (> 60 символов)')
        else:
            seo['issues'].append('Отсутствует тег <title>')

        # Meta description
        meta_desc = soup.find('meta', attrs={'name': 'description'})
        if meta_desc:
            seo['description'] = meta_desc.get('content', '').strip()
            if len(seo['description']) < 120:
                seo['issues'].append('Description слишком короткий (< 120 символов)')
            elif len(seo['description']) > 160:
                seo['issues'].append('Description слишком длинный (> 160 символов)')
        else:
            seo['issues'].append('Отсутствует meta description')

        # Keywords
        meta_keywords = soup.find('meta', attrs={'name': 'keywords'})
        if meta_keywords:
            seo['keywords'] = meta_keywords.get('content', '').strip()

        # Open Graph
        og_title = soup.find('meta', attrs={'property': 'og:title'})
        if og_title:
            seo['og_title'] = og_title.get('content', '').strip()

        og_desc = soup.find('meta', attrs={'property': 'og:description'})
        if og_desc:
            seo['og_description'] = og_desc.get('content', '').strip()

        og_image = soup.find('meta', attrs={'property': 'og:image'})
        if og_image:
            seo['og_image'] = og_image.get('content', '').strip()

        # Canonical
        canonical = soup.find('link', attrs={'rel': 'canonical'})
        if canonical:
            seo['canonical'] = canonical.get('href', '').strip()

        # Robots
        robots = soup.find('meta', attrs={'name': 'robots'})
        if robots:
            seo['robots'] = robots.get('content', '').strip()

        # Вывод результатов SEO
        print(f"\n{Colors.BLUE}📊 SEO проверка:{Colors.RESET}")
        if seo['title']:
            print(f"  Title: {seo['title'][:60]}...")
        if seo['description']:
            print(f"  Description: {seo['description'][:80]}...")
        if seo['issues']:
            for issue in seo['issues']:
                print(f"  {Colors.YELLOW}⚠ {issue}{Colors.RESET}")
        else:
            print(f"  {Colors.GREEN}✓ SEO метаданные в порядке{Colors.RESET}")

        return seo

    def check_performance_hints(self, soup: BeautifulSoup, response: requests.Response) -> Dict:
        """Проверяет подсказки для производительности"""
        hints = {
            'images_without_alt': [],
            'images_count': 0,
            'scripts_count': 0,
            'stylesheets_count': 0,
            'videos_count': 0,
            'issues': []
        }

        # Изображения
        images = soup.find_all('img')
        hints['images_count'] = len(images)
        for img in images:
            if not img.get('alt'):
                src = img.get('src', '')
                hints['images_without_alt'].append(src)
            if not img.get('loading'):
                hints['issues'].append('Некоторые изображения без lazy loading')

        # Скрипты
        scripts = soup.find_all('script')
        hints['scripts_count'] = len(scripts)

        # Стили
        stylesheets = soup.find_all('link', attrs={'rel': 'stylesheet'})
        hints['stylesheets_count'] = len(stylesheets)

        # Видео
        videos = soup.find_all('video')
        hints['videos_count'] = len(videos)

        # Проверка заголовков кэширования
        cache_control = response.headers.get('Cache-Control', '')
        if not cache_control:
            hints['issues'].append('Отсутствует Cache-Control заголовок')

        # Проверка сжатия
        content_encoding = response.headers.get('Content-Encoding', '')
        if 'gzip' not in content_encoding and 'br' not in content_encoding:
            hints['issues'].append('Возможно отсутствует сжатие (gzip/brotli)')

        # Вывод подсказок
        if hints['issues']:
            print(f"\n{Colors.YELLOW}💡 Подсказки производительности:{Colors.RESET}")
            for issue in hints['issues']:
                print(f"  ⚠ {issue}")

        return hints

    def check_resources(self, soup: BeautifulSoup, base_url: str) -> Dict:
        """Проверяет внешние ресурсы (CSS, JS, изображения)"""
        resources = {
            'css': [],
            'js': [],
            'images': [],
            'fonts': [],
            'issues': []
        }
        
        # CSS файлы
        css_links = soup.find_all('link', attrs={'rel': 'stylesheet'})
        for link in css_links:
            href = link.get('href', '')
            if href:
                full_url = urljoin(base_url, href)
                resources['css'].append(full_url)
        
        # JS файлы
        js_scripts = soup.find_all('script', src=True)
        for script in js_scripts:
            src = script.get('src', '')
            if src:
                full_url = urljoin(base_url, src)
                resources['js'].append(full_url)
        
        # Изображения
        images = soup.find_all('img', src=True)
        for img in images:
            src = img.get('src', '')
            if src and not src.startswith('data:'):
                full_url = urljoin(base_url, src)
                resources['images'].append(full_url)
        
        # Проверяем размеры критических ресурсов
        if len(resources['css']) > 5:
            resources['issues'].append(f'Много CSS файлов ({len(resources["css"])}) - рассмотрите объединение')
        if len(resources['js']) > 10:
            resources['issues'].append(f'Много JS файлов ({len(resources["js"])}) - рассмотрите code splitting')
        
        return resources

    def check_api_endpoints(self, endpoints: List[str]) -> Dict:
        """Проверяет API endpoints"""
        print(f"\n{Colors.CYAN}🔌 Проверка API endpoints:{Colors.RESET}")
        api_results = {}

        for endpoint in endpoints:
            url = urljoin(self.base_url, endpoint)
            print(f"\n  Проверка: {endpoint}")

            success, response, load_time, _ = self.check_url(url)

            if success and response:
                status_emoji = "✓" if response.status_code == 200 else "⚠"
                status_color = Colors.GREEN if response.status_code == 200 else Colors.YELLOW
                print(f"  {status_color}{status_emoji} {response.status_code} ({load_time:.3f}s){Colors.RESET}")

                api_results[endpoint] = {
                    'status_code': response.status_code,
                    'load_time': round(load_time, 3),
                    'size': len(response.content)
                }
            else:
                print(f"  {Colors.RED}✗ Ошибка{Colors.RESET}")
                api_results[endpoint] = {'error': 'Не удалось загрузить'}

        return api_results

    def check_sitemap(self) -> Dict:
        """Проверяет sitemap.xml"""
        sitemap_url = urljoin(self.base_url, '/sitemap.xml')
        print(f"\n{Colors.CYAN}🗺 Проверка sitemap.xml:{Colors.RESET}")

        success, response, load_time, _ = self.check_url(sitemap_url)

        if success and response:
            if response.status_code == 200:
                print(f"{Colors.GREEN}✓ Sitemap доступен ({load_time:.3f}s){Colors.RESET}")
                try:
                    # Парсим sitemap
                    soup = BeautifulSoup(response.text, 'xml')
                    urls = soup.find_all('url')
                    print(f"  Найдено URL: {len(urls)}")
                    if urls:
                        # Показываем первые несколько URL
                        for i, url_tag in enumerate(urls[:3]):
                            loc = url_tag.find('loc')
                            if loc:
                                print(f"    - {loc.get_text()}")
                    return {
                        'status': 'ok',
                        'urls_count': len(urls),
                        'load_time': round(load_time, 3)
                    }
                except Exception as e:
                    print(f"{Colors.YELLOW}⚠ Ошибка парсинга sitemap: {e}{Colors.RESET}")
                    print(f"  Ответ сервера: {response.text[:200]}...")
                    return {'status': 'parse_error', 'error': str(e)}
            else:
                print(f"{Colors.YELLOW}⚠ Sitemap вернул статус {response.status_code}{Colors.RESET}")
                return {'status': 'error', 'status_code': response.status_code}
        else:
            print(f"{Colors.RED}✗ Sitemap недоступен (проверьте, что sitemap.ts создаёт правильный маршрут){Colors.RESET}")
            return {'status': 'error'}

    def check_robots(self) -> Dict:
        """Проверяет robots.txt"""
        robots_url = urljoin(self.base_url, '/robots.txt')
        print(f"\n{Colors.CYAN}🤖 Проверка robots.txt:{Colors.RESET}")

        success, response, load_time, _ = self.check_url(robots_url)

        if success and response and response.status_code == 200:
            print(f"{Colors.GREEN}✓ Robots.txt доступен ({load_time:.3f}s){Colors.RESET}")
            print(f"  Содержимое:\n{response.text[:200]}...")
            return {
                'status': 'ok',
                'load_time': round(load_time, 3)
            }
        else:
            print(f"{Colors.YELLOW}⚠ Robots.txt недоступен или не найден{Colors.RESET}")
            return {'status': 'not_found'}

    def generate_report(self, pages: List[str], api_endpoints: Optional[List[str]] = None) -> Dict:
        """Генерирует полный отчёт"""
        print(f"\n{Colors.BOLD}{Colors.CYAN}{'='*60}")
        print(f"Проверка производительности сайта: {self.base_url}")
        print(f"{'='*60}{Colors.RESET}\n")

        report = {
            'base_url': self.base_url,
            'timestamp': datetime.now().isoformat(),
            'pages': {},
            'api': {},
            'sitemap': {},
            'robots': {},
            'summary': {}
        }

        # Проверка страниц
        for page in pages:
            url = urljoin(self.base_url, page)
            report['pages'][page] = self.check_page_performance(url)

        # Проверка API
        if api_endpoints:
            report['api'] = self.check_api_endpoints(api_endpoints)

        # Проверка sitemap
        report['sitemap'] = self.check_sitemap()

        # Проверка robots
        report['robots'] = self.check_robots()

        # Сводка
        total_pages = len(report['pages'])
        ok_pages = sum(1 for p in report['pages'].values() if p.get('status') == 'ok')
        avg_load_time = sum(p.get('load_time', 0) for p in report['pages'].values()) / total_pages if total_pages > 0 else 0

        report['summary'] = {
            'total_pages': total_pages,
            'ok_pages': ok_pages,
            'error_pages': total_pages - ok_pages,
            'average_load_time': round(avg_load_time, 3),
            'status': 'ok' if ok_pages == total_pages else 'warning'
        }

        # Вывод сводки
        print(f"\n{Colors.BOLD}{Colors.CYAN}{'='*60}")
        print(f"Сводка:{Colors.RESET}")
        print(f"  Проверено страниц: {total_pages}")
        print(f"  Успешно: {Colors.GREEN}{ok_pages}{Colors.RESET}")
        print(f"  Ошибок: {Colors.RED}{total_pages - ok_pages}{Colors.RESET}")
        print(f"  Среднее время загрузки: {avg_load_time:.3f}s")
        print(f"{'='*60}\n")

        return report

def main():
    parser = argparse.ArgumentParser(description='Проверка производительности сайта')
    parser.add_argument('--url', type=str, default='https://prizmabox.org',
                       help='Базовый URL сайта (по умолчанию: http://localhost:3000)')
    parser.add_argument('--pages', type=str, nargs='+',
                       default=['/', '/service/ded-moroz', '/login', '/profile'],
                       help='Страницы для проверки')
    parser.add_argument('--api', type=str, nargs='+',
                       default=['/api/videos/example/random', '/api/init'],
                       help='API endpoints для проверки')
    parser.add_argument('--output', type=str, help='Файл для сохранения JSON отчёта')
    parser.add_argument('--timeout', type=int, default=30, help='Таймаут запросов в секундах')

    args = parser.parse_args()

    checker = PerformanceChecker(args.url, timeout=args.timeout)
    report = checker.generate_report(args.pages, args.api)

    # Сохранение отчёта
    if args.output:
        with open(args.output, 'w', encoding='utf-8') as f:
            json.dump(report, f, ensure_ascii=False, indent=2)
        print(f"{Colors.GREEN}✓ Отчёт сохранён в {args.output}{Colors.RESET}")

    # Возвращаем код выхода в зависимости от результата
    if report['summary']['status'] == 'ok':
        sys.exit(0)
    else:
        sys.exit(1)

if __name__ == '__main__':
    main()
