import { EConstants, EExtensionProp, TTokenData } from "../../types";
import { deconstructPath } from "../helper";

export function parseToken(token: TTokenData): { [key: string]: TTokenData } {
  if (token.isExtension) {
    token = parseExtensionToken(token)
  } else {
    token = parseSimpleToken(token)
  }

  return {
    [token.name]: token
  }
}

function parseSimpleToken(token: TTokenData): TTokenData {
  return token
}

function parseExtensionToken(token: TTokenData): TTokenData {
  token.name = token.name.replace(`${EConstants.TOKEN_NAME_DELIMITER}${EConstants.EXTENSIONS}`, '')
  token.path = token.path.replace(`${EConstants.DOT_PATH_DELIMITER}${EConstants.EXTENSIONS}`, '')

  const { groupName, rootKey } = deconstructPath(token.path)

  token.groupName = groupName
  token.rootKey = rootKey

  switch (token.modifier) {
    case EExtensionProp.ALPHA:
      token.value = setColorAlphaValue(token)
      break;

    case EExtensionProp.HUE:
      break;

  }

  return token
}

function setColorAlphaValue(token: TTokenData): TTokenData['value'] {
  token.description = `${token.description ?? ''} (${token.modifier} ${token.parentKey})`.trim()
  return token.value
}