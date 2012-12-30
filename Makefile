JS_ORDER := js/jquery-1.7.1.ugly.js \
	    js/dummyConsole.ugly.js \
	    js/json2-2011-11-18.ugly.js \
	    js/jquery.ui.core-1.8.18.ugly.js \
	    js/jquery.effects.core-1.8.18.ugly.js \
	    js/jquery.effects.highlight-1.8.18.ugly.js \
	    js/joyceCometClient.ugly.js \
	    js/tkb.ugly.js 

default: js/bundle.ugly.js style/mobile.css style/mobile.min.css \
			   style/screen.css style/screen.min.css

js/bundle.ugly.js: $(JS_ORDER)
	cat $(JS_ORDER) > $@

js/%.ugly.js: js/%.js
	uglifyjs $< -o $@ -m -c

style/%.css: style/%.scss style/common.scss
	scss $<:$@

style/%.min.css: style/%.scss style/common.scss
	scss $<:$@ --style compressed

clean:
	rm -f $(JS_ORDER) style/*.min.css js/bundle.ugly.js
