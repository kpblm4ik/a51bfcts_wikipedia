module.exports = function(eleventyConfig) {
    // Настройки парсера Markdown
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
        // Автоматически назначаем движок шаблонизатора
        markdownTemplateEngine: "liquid",
        htmlTemplateEngine: "liquid"
    };
};
