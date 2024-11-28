# Naming Conventions

This document outlines the standardized naming conventions for JavaScript files in our MVC web application architecture.

## General Rules

- Use camelCase
- Be descriptive and clear
- Include appropriate suffixes (.model.js, .controller.js, etc.)
- Avoid abbreviations unless universally understood
- Never use spaces or special characters
- Always use lowercase

## File Naming Patterns

### 1. Models
```
model-name.model.js
```
Examples:
- user.model.js
- product.model.js
- cart.model.js

### 2. Controllers
```
name.controller.js
```
Examples:
- user.controller.js
- product.controller.js
- cart.controller.js

### 3. Views/Components
```
name.view.js
```
Examples:
- header.view.js
- sidebar.view.js
- productList.view.js

### 4. Utilities/Helpers
```
name.util.js
```
Examples:
- validation.util.js
- formatter.util.js
- helper.util.js

### 5. Services
```
name.service.js
```
Examples:
- api.service.js
- auth.service.js
- data.service.js

### 6. Constants
```
name.const.js
```
Examples:
- paths.const.js
- config.const.js
- routes.const.js

## Best Practices

1. Keep names concise but descriptive
2. Use full words rather than abbreviations when possible
3. Group related files in appropriate directories
4. Maintain consistency across the entire project
5. Follow the single responsibility principle - one file should do one thing
6. Use suffixes to clearly indicate file purpose
7. Ensure names reflect the file's contents accurately

## Directory Structure Example

```
src/
├── models/
│   ├── user.model.js
│   └── product.model.js
├── controllers/
│   ├── user.controller.js
│   └── product.controller.js
├── views/
│   ├── header.view.js
│   └── sidebar.view.js
├── utils/
│   └── validation.util.js
├── services/
│   └── api.service.js
└── constants/
    └── paths.const.js
```

## HTML File Naming Conventions

### General Rules for HTML Files
```
name.template.html
```
or
```
name.page.html
```

Examples:
- user-profile.template.html
- product-list.template.html
- home.page.html
- about.page.html

### BEM-Based Template Naming
Templates should follow Block-Element-Modifier pattern in their naming:

1. Block-level templates:
```
block-name.template.html
```
Examples:
- header.template.html
- footer.template.html
- navigation.template.html

2. Element-specific templates:
```
block-name__element-name.template.html
```
Examples:
- form__login.template.html
- card__product.template.html
- navigation__menu.template.html

3. Modified templates:
```
block-name--modifier.template.html
```
Examples:
- header--compact.template.html
- form--dark.template.html
- card--featured.template.html

### Page Templates
Main page templates should use the .page.html suffix:
```
page-name.page.html
```
Examples:
- home.page.html
- about.page.html
- contact.page.html
- products.page.html

### Component Templates
Reusable components should use the .component.html suffix:
```
component-name.component.html
```
Examples:
- modal.component.html
- tooltip.component.html
- dropdown.component.html

### Directory Structure Example for HTML Files
```
src/
├── pages/
│   ├── home.page.html
│   ├── about.page.html
│   └── contact.page.html
├── templates/
│   ├── header.template.html
│   ├── footer.template.html
│   └── navigation.template.html
├── components/
│   ├── modal.component.html
│   ├── form__login.template.html
│   └── card__product.template.html
└── layouts/
    ├── default.layout.html
    └── admin.layout.html
```

### Best Practices for HTML Files
1. Use hyphens (-) for word separation in filenames
2. Use double underscores (__) for elements following BEM
3. Use double hyphens (--) for modifiers following BEM
4. Keep names lowercase
5. Avoid special characters and spaces
6. Use appropriate suffixes (.template.html, .page.html, .component.html)
7. Group related templates in appropriate directories
8. Maintain consistency with JavaScript and CSS naming patterns

## Notes

- The naming conventions support the MVC architecture and modular design
- Files should be easily traceable through the directory structure
- Names should support code reusability and maintainability
- Follow BEM methodology for related CSS class naming
- Maintain consistency with established conventions
- Do not modify working files or established patterns