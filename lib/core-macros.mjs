#external module

module.exports = (ast) -> do (

#meta
  var composeMacroArguments = (nameArg, argsTuple) ->
    var nameValue = nameArg.getSimpleValue()
    if (nameValue == null)
      argsTuple.error 'Invalid name argument'
      return null
    if (!(argsTuple.isTuple()))
      argsTuple.error 'Expected tuple argument'
      return null
    var
      ok = true
      name = nameArg.newValue nameValue
      arity = ast.newValue 'unary'
      precedence = ast.newValue 'LOW'
      options = ast.newObjectLiteral()
    loop (var index = 0)
      if (index < argsTuple.count)
        var arg = argsTuple.at index
        var simpleValue = arg.getSimpleValue()
        if (simpleValue != null)
          if (index == 0)
            arity = arg.copy()
          else if (index == 1)
            precedence = arg.copy()
          else
            arg.error('Invalid simple property')
            ok = false
        else if (arg.isProperty())
          var property = arg.copy()
          var value = arg.at 1
          if (value.isFunctionDefinition())
            var func = value.copy()
            var macroBody = func.pop().asTuple()
            var macroArgs = func.pop().asTuple()
            func .push(arg.newTag 'ast')
            func.push macroBody
            loop (var argIndex = 0)
              if (argIndex < macroArgs.count)
                var macroArg = macroArgs.at argIndex
                if (macroArg.isTag())
                  var argDeclaration = #quote var __argName = ast.at __argIndex
                  argDeclaration.replaceTag('__argName', (macroArg.newTag(macroArg.getTag())).handleAsTagDeclaration())
                  argDeclaration.replaceTag('__argIndex', macroArg.newValue(argIndex))
                  macroBody.unshift argDeclaration
                else
                  macroArg.error 'Argument name expected'
                  ok = false
                next argIndex + 1
            if ok
              property.pop()
              property.push func
          options.push property
        else
          arg.error('Invalid property')
          ok = false
        next index + 1
    if ok [name, arity, precedence, options] else null

  ast.defineSymbol
    ast.createMacro
      '#exec-meta'
      'unary'
      'LOW'
      {
        preExpand: (ast) ->
          var code = (ast.at 0).copy()
          var innerDo = ast.newDo([code.copy(), ast.newTag 'null'])
          ast.newMeta innerDo
      }
  ast.defineSymbol
    ast.createMacro
      '#keep-meta'
      'unary'
      'LOW'
      {
        preExpand: (ast) ->
          var code = (ast.at 0).copy()
          var tail = #quote (ast.at(0).at(0).copy())
          var innerDo = ast.newDo([code.copy(), tail])
          ast.newMeta innerDo
      }

  ast.defineSymbol
    ast.createMacro
      '#macro'
      'binaryKeyword'
      'LOW'
      {
        expand: (ast) ->
          if (!ast.count == 2) do
            ast.error('Expected arguments: name and properties')
            return null
          var argsTuple = (ast.at 1).asTuple()
          var args = composeMacroArguments(ast.at 0, argsTuple)
          if (args != null) do
            var result = #quote (ast.createMacro(__arg0, __arg1, __arg2, __arg3))
            result.replaceTag('__arg0', args[0])
            result.replaceTag('__arg1', args[1])
            result.replaceTag('__arg2', args[2])
            result.replaceTag('__arg3', args[3])
            result
          else
            null
      }
  ast.defineSymbol
    ast.createMacro
      '#defmacro'
      'binaryKeyword'
      'LOW'
      {
        preExpand: (ast) ->
          if (!ast.count == 2) do
            ast.error('Expected arguments: name and properties')
            return null
          var argsTuple = (ast.at 1).asTuple()
          var args = composeMacroArguments(ast.at 0, argsTuple)
          if (args != null) do
            var result = #quote (ast.defineSymbol(ast.createMacro(__arg0, __arg1, __arg2, __arg3)), null)
            result.replaceTag('__arg0', args[0])
            result.replaceTag('__arg1', args[1])
            result.replaceTag('__arg2', args[2])
            result.replaceTag('__arg3', args[3])
            ast.newMeta(ast.newDo(result))
          else
            null
      }

  ; Trick to compile the code twice: in this compilation context and for the generated JS.
  ; It removes this last statement from the code (so that it does not appear in the generated
  ; file) but makes so that the top level #meta keeps the code (by returning ast.at 0).
  do ((ast.at 0).pop(), (ast.at 0).push(ast.newTag 'null'), ast.at 0)

)