export default function(eleventyConfig) {
    // Говорим Eleventy, что файлы .md нужно обрабатывать как Liquid + Markdown
    eleventyConfig.setMarkdownOptions({
        html: true,
        breaks: true,
        linkify: true
    });

    return {
        dir: {
            input: ".",
            includes: "_includes",
            output: "_site"
        },
        // Силой назначаем layout.html главным шаблоном для ВСЕХ страниц по умолчанию
        markdownTemplateEngine: "liquid",
        htmlTemplateEngine: "liquid"
    };
};
