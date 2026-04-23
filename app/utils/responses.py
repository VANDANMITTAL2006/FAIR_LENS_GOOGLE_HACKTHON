def error(message: str, detail: str = ""):
    return {"success": False, "error": message, "detail": detail}


def success(data: dict):
    return {"success": True, "data": data}
