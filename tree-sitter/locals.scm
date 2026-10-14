; Function-like constructs introduce parameter scopes.
[
  (function_declaration)
  (lambda_expression)
  (block)
  (for_statement)
  (pattern_arm)
  (pattern_quote_expression)
  (code_expression)
  (on_drop_error_statement)
] @local.scope

; Lifetime binders use a separate namespace from value parameters.
((lifetimes_directive) @local.scope
  (#set! local.scope-inherits false))

; Parameters
(receiver_parameter
  (self_expression) @local.definition)
(parameter
  name: (binding_list [
    (identifier)
    (code_splice_identifier)
    (non_hygienic_identifier)
  ] @local.definition))
(parameter
  name: [
    (identifier)
    (code_splice_identifier)
    (non_hygienic_identifier)
  ] @local.definition)
(comptime_parameter
  name: (binding_list [
    (identifier)
    (code_splice_identifier)
    (non_hygienic_identifier)
  ] @local.definition))
(lambda_parameter
  name: (identifier) @local.definition)
(on_drop_error_statement
  error: (identifier) @local.definition)

; Local bindings prevent a same-named outer parameter from leaking through a
; shadowing declaration.
(variable_declaration
  name: (binding_list [
    (identifier)
    (code_splice_identifier)
    (non_hygienic_identifier)
  ] @local.definition))
(for_statement
  name: (identifier) @local.definition)
(for_statement
  index: (identifier) @local.definition)
(pattern_binding
  name: (identifier) @local.definition)
(pointer_pattern
  name: (identifier) @local.definition)

; References
[
  (identifier)
  (code_splice_identifier)
  (non_hygienic_identifier)
  (self_expression)
] @local.reference
