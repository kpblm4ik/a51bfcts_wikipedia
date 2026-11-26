package main

import (
	"fmt"
	"os"
	"regexp"
	"strings"

	"github.com/gocolly/colly/v2"
)

func main() {
	base := strings.TrimSpace(os.Getenv("TARGET"))
	if base == "" {
		base = "https://kpblm4ik.github.io/a51bfcts_wikipedia/"
	}
	if !strings.HasSuffix(base, "/") {
		base += "/"
	}
	pages := []string{"work.html", "ads.html"}
	re := regexp.MustCompile(`FORMS_ENDPOINT\s*=\s*("([^"]*)"|null)`)
	fmt.Printf("Бот: colly\nЦель: %s\nКачает HTML без выполнения JS, всего тестов: %d\n", base, len(pages))
	ok := 0
	for i, p := range pages {
		forms, areas, inputs := 0, 0, 0
		endpoint := ""
		c := colly.NewCollector()
		c.OnHTML("form", func(e *colly.HTMLElement) { forms++ })
		c.OnHTML("textarea", func(e *colly.HTMLElement) { areas++ })
		c.OnHTML("input", func(e *colly.HTMLElement) { inputs++ })
		c.OnResponse(func(r *colly.Response) {
			if m := re.FindSubmatch(r.Body); m != nil {
				endpoint = string(m[2])
			}
		})
		fmt.Printf("[%d/%d] colly %s\n", i+1, len(pages), p)
		if err := c.Visit(base + p); err != nil {
			fmt.Printf("FAIL COLLY %s: ошибка запроса (%v)\n", p, err)
			continue
		}
		found := forms > 0 || areas > 0
		if found {
			fmt.Printf("FAIL COLLY %s: ФОРМА ВИДНА В HTML (form: %d, textarea: %d, input: %d)\n", p, forms, areas, inputs)
		} else {
			ok++
			fmt.Printf("OK   COLLY %s: форма в HTML не найдена (form: %d, textarea: %d, input: %d)\n", p, forms, areas, inputs)
		}
		if endpoint != "" {
			fmt.Printf("HTTP %s: endpoint %s открыт для прямого POST (нужна проверка на сервере)\n", p, endpoint)
		} else {
			fmt.Printf("HTTP %s: endpoint не задан, прямой POST невозможен\n", p)
		}
	}
	fmt.Printf("ИТОГ: %d из %d тестов прошли\n", ok, len(pages))
	if ok != len(pages) {
		os.Exit(1)
	}
}
