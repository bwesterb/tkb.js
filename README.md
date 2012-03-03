tkb.js
======

`tkb.js` is a pure javascript/html/css frontend of the
[terminal kamer bezettings daemon](http://github.com/bwesterb/tkbd)
running on the faculty of sciences
of the [Radboud University Nijmegen](http://ru.nl).

It lets you see which computer lab has free PCs.

Installing
----------
1. Put the files online.
2. Copy `config.js.example` to `config.js`. Edit it, if you are
   running a `tkbd` instance of your own.

Changelog
---------
* Fifth release
  * Bundle and minify all javascript into one file.
    Loading will be a lot faster on mobiles.
* Fourth release
  * Highlights on updates
  * Fixed some animation glitches
  * Increased usability on smartphones:
    * A solid background is shown when the gradient image has not
      been loaded yet.
    * Disabled slow animations on pageload
    * Hide statusbar on MobileSafari
* Third release
  * Compatibility with older browsers (in particular Firefox 2/3)
* Second release
  * Great new design thanks to [Judith](http://jd7h.com)
  * Mobile support thanks to [Ruben](https://github.com/rnijveld)
