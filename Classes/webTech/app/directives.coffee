'use strict'

# Directives 
angular.module('myApp.directives', [])
.directive( 'appVersion', [
	'version'
	(version) ->
		(scope, elm, attrs) ->
			elm.text version
			return
])
.directive('codeMirror', ['CMdi', 'CM', 'jsBridge', (CMdi, CM, jsBridge) ->
	# console.log 'directive'
	

	(scope, elm, attrs) ->
		console.log 'hi'
		# CM = CMd.CodeMirror
		d  = CMdi
		console.log 'hii ' + String( CM )
		
		# $('body').css 'background-color', 'orange'
		elm.css
			'width': '100%'
			'height': '100%'

		# console.log 'directive CodeMirror ran'
		# console.log String( elm )
		try
			myCM = CM elm[0],
				lineNumbers: true
				autofocus: true
				autoCloseBrackets: true
				# onKeyEvent: (cm, e) ->
				# 	$.event.fix e
				# 	return
			
		catch e
			console.log 'error CM ' + String( e )
			# bridge.send 'error loading CodeMirror: ' + String( e )
		
		$('.CodeMirror').css
			'width': '100%'
			'height': '100%'
			# 'display': 'none'
		d.resolve myCM
		# jsBridge.then (jsBridge) ->
		# 	jsBridge.send 'jsBridge ' + String( d.promise )
		# 	return
		scope.apply()
		return
])