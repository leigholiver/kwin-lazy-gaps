install:
	plasmapkg2 --type kwinscript -i .
	mkdir -p ~/.local/share/kservices5
	ln -sf ~/.local/share/kwin/scripts/lazy-gaps/metadata.desktop ~/.local/share/kservices5/kwin-script-lazy-gaps.desktop

uninstall:
	plasmapkg2 --type kwinscript -r lazy-gaps
	rm ~/.local/share/kservices5/kwin-script-lazy-gaps.desktop

debug:
	QT_LOGGING_RULES="kwin_*.debug=true" kwin --replace && tail -f ~/.xsession-errors