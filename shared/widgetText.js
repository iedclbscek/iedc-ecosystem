export function widgetTextRuns(body = '') {
 return String(body).split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).filter(Boolean).map(text => text.startsWith('**') ? {text:text.slice(2,-2),format:'bold'} : text.startsWith('*') ? {text:text.slice(1,-1),format:'italic'} : {text,format:'plain'});
}
