from __future__ import annotations

import re

from scripts.source_audit.models import AuditValidationError


SOURCE_REF = re.compile(r"([^:]+):([1-9][0-9]*)(?:-([1-9][0-9]*))?")
CORE_CONTENT = re.compile(r"^\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|$")
CORE_CONTENT_BULLET = re.compile(r"^\s*-\s+\*\*核心内容：\*\*\s*(.+?)\s*$")
NUMBERED_ITEM = re.compile(r"^\s*([0-9]+)[.)、]\s*(.+)$")


def _one_section(sections, heading_anchor):
    if not isinstance(sections, list):
        raise AuditValidationError("Markdown sections must be a list")
    matches = [
        section
        for section in sections
        if isinstance(section, dict) and section.get("heading") == heading_anchor
    ]
    if len(matches) != 1:
        raise AuditValidationError(f"expected one Markdown heading: {heading_anchor}")
    return matches[0]


def _line_source_ref(section, offset):
    line_number = section["startLine"] + offset
    return f"{section['path']}:{line_number}-{line_number}"


def _course_core_content_rows(outline_sections, expected_lesson_ids):
    if not isinstance(expected_lesson_ids, list) or expected_lesson_ids != sorted(
        set(expected_lesson_ids)
    ):
        raise AuditValidationError(
            "course objective lessonIds must be sorted and unique"
        )
    rows = []
    for lesson_id in expected_lesson_ids:
        matches = [
            section
            for section in outline_sections
            if section.get("heading", "").startswith(f"{lesson_id} ")
        ]
        if len(matches) != 1:
            raise AuditValidationError(f"expected one course heading for {lesson_id}")
        section = matches[0]
        content_matches = []
        for offset, line in enumerate(section["text"].splitlines()):
            match = CORE_CONTENT.fullmatch(line)
            if match is not None and match.group(1).strip() == "核心内容":
                content_matches.append((offset, match.group(2)))
            elif (bullet_match := CORE_CONTENT_BULLET.fullmatch(line)) is not None:
                content_matches.append((offset, bullet_match.group(1)))
            elif line.startswith("核心内容：") and line[len("核心内容：") :].strip():
                content_matches.append((offset, line[len("核心内容：") :].strip()))
        if len(content_matches) != 1:
            raise AuditValidationError(f"expected one 核心内容 for {lesson_id}")
        offset, text = content_matches[0]
        rows.append(
            {
                "mustKeepId": f"course-objective-{lesson_id}",
                "text": text,
                "sourceRef": _line_source_ref(section, offset),
                "_lessonId": lesson_id,
            }
        )
    return rows


def _numbered_list_rows(section, expected_count, id_prefix):
    rows = []
    for offset, line in enumerate(section["text"].splitlines()):
        match = NUMBERED_ITEM.fullmatch(line)
        if match is not None:
            rows.append(
                {
                    "ordinal": int(match.group(1)),
                    "text": match.group(2),
                    "sourceRef": _line_source_ref(section, offset),
                }
            )
    expected_ordinals = list(range(1, expected_count + 1))
    if [row["ordinal"] for row in rows] != expected_ordinals:
        raise AuditValidationError(
            f"{id_prefix} must contain numbered items 1..{expected_count}"
        )
    return [
        {
            "mustKeepId": f"{id_prefix}-{row['ordinal']:02d}",
            "text": row["text"],
            "sourceRef": row["sourceRef"],
        }
        for row in rows
    ]


def _table_cells(line):
    value = line.strip()
    if not value.startswith("|") or not value.endswith("|"):
        return None
    cells = []
    current = []
    escaped = False
    for character in value[1:-1]:
        if escaped:
            current.append(character)
            escaped = False
        elif character == "\\":
            current.append(character)
            escaped = True
        elif character == "|":
            cells.append("".join(current).strip())
            current = []
        else:
            current.append(character)
    cells.append("".join(current).strip())
    return cells


def _markdown_table_rows(section, expected_count, id_prefix):
    lines = section["text"].splitlines()
    table = []
    for offset, line in enumerate(lines):
        cells = _table_cells(line)
        if cells is None:
            if table:
                break
            continue
        table.append((offset, line.strip(), cells))
    if len(table) < 2:
        raise AuditValidationError(f"missing Markdown table: {id_prefix}")
    header = table[0][2]
    divider = table[1][2]
    if (
        len(header) < 1
        or len(divider) != len(header)
        or any(re.fullmatch(r":?-{3,}:?", cell) is None for cell in divider)
    ):
        raise AuditValidationError(f"invalid Markdown table header: {id_prefix}")
    data = table[2:]
    if len(data) != expected_count:
        raise AuditValidationError(
            f"{id_prefix} must contain {expected_count} table rows"
        )
    rows = []
    for ordinal, (offset, raw_line, cells) in enumerate(data, start=1):
        if len(cells) != len(header) or any(not cell for cell in cells):
            raise AuditValidationError(
                f"invalid Markdown table row: {id_prefix}-{ordinal:02d}"
            )
        rows.append(
            {
                "mustKeepId": f"{id_prefix}-{ordinal:02d}",
                "text": raw_line,
                "sourceRef": _line_source_ref(section, offset),
            }
        )
    return rows


def _validated_routes(routes, label):
    if not isinstance(routes, list):
        raise AuditValidationError(f"{label} routes must be a list")
    result = []
    for route in routes:
        if not isinstance(route, dict):
            raise AuditValidationError(f"{label} route must be an object")
        if set(route) not in ({"chapter"}, {"chapter", "sectionAnchor"}):
            raise AuditValidationError(f"{label} route fields mismatch")
        if type(route["chapter"]) is not int or route["chapter"] < 1:
            raise AuditValidationError(f"{label} route chapter is invalid")
        if "sectionAnchor" in route and (
            not isinstance(route["sectionAnchor"], str)
            or not route["sectionAnchor"].strip()
        ):
            raise AuditValidationError(f"{label} sectionAnchor must be non-blank")
        result.append(dict(route))
    if result != sorted(
        result, key=lambda route: (route["chapter"], route.get("sectionAnchor", ""))
    ):
        raise AuditValidationError(f"{label} routes must use stable order")
    if len({(route["chapter"], route.get("sectionAnchor")) for route in result}) != len(
        result
    ):
        raise AuditValidationError(f"{label} routes contain duplicates")
    return result


def _expected_inventory_ids(policy):
    rules = policy["mustKeepRules"]
    result = {
        f"course-objective-{lesson_id}"
        for lesson_id in rules["courseObjectives"]["lessonIds"]
    }
    result.update(rules["highPriority"]["routing"])
    result.update(rules["highRisk"]["routing"])
    return result


def _outline_anchor_bounds(section_anchor, source_outline):
    matches = [
        (position, item)
        for position, item in enumerate(source_outline)
        if item.get("title") == section_anchor
    ]
    if len(matches) != 1:
        raise AuditValidationError(
            f"expected one source outline anchor: {section_anchor}"
        )
    start_position, start = matches[0]
    end_position = len(source_outline)
    next_start = None
    for position, candidate in enumerate(
        source_outline[start_position + 1 :], start=start_position + 1
    ):
        if candidate["depth"] <= start["depth"]:
            end_position = position
            next_start = candidate
            break
    return start_position, end_position, start, next_start


def _item_matches_route(item, route, source_map, source_outline):
    page_item = source_map.get(f"page-{item['pdfPage']:03d}")
    chapter = page_item.get("chapter") if page_item is not None else item.get("chapter")
    if chapter != route["chapter"]:
        return False
    anchor = route.get("sectionAnchor")
    if anchor is None:
        return True
    start_position, end_position, start, next_start = _outline_anchor_bounds(
        anchor, source_outline
    )
    if item["kind"] == "outline":
        positions = {
            value["sourceId"]: position for position, value in enumerate(source_outline)
        }
        position = positions.get(item["sourceId"])
        return position is not None and start_position <= position < end_position
    end_page = (
        next_start["pdfPage"]
        if next_start is not None
        else max(value["pdfPage"] for value in source_outline) + 1
    )
    return start["pdfPage"] <= item["pdfPage"] < end_page


def _matched_route_roles(item, inventory_item, source_map, source_outline):
    roles = set()
    if any(
        _item_matches_route(item, route, source_map, source_outline)
        for route in inventory_item["primarySourceRoutes"]
    ):
        roles.add("primary")
    if any(
        _item_matches_route(item, route, source_map, source_outline)
        for route in inventory_item["secondarySourceRoutes"]
    ):
        roles.add("secondary")
    return roles


def _validate_inventory_item_structure(item, policy):
    expected_fields = {
        "mustKeepId",
        "text",
        "sourceRef",
        "primarySourceRoutes",
        "secondarySourceRoutes",
        "lessonIds",
        "versionStatus",
    }
    if not isinstance(item, dict) or set(item) != expected_fields:
        raise AuditValidationError("must-keep inventory fields mismatch")
    must_keep_id = item["mustKeepId"]
    if not isinstance(must_keep_id, str) or not must_keep_id.strip():
        raise AuditValidationError("mustKeepId must be non-blank")
    if not isinstance(item["text"], str) or not item["text"].strip():
        raise AuditValidationError(f"must-keep text is blank: {must_keep_id}")
    match = SOURCE_REF.fullmatch(item["sourceRef"])
    if match is None or (
        match.group(3) is not None and int(match.group(3)) < int(match.group(2))
    ):
        raise AuditValidationError(f"invalid must-keep sourceRef: {must_keep_id}")
    _validated_routes(item["primarySourceRoutes"], f"{must_keep_id} primary")
    _validated_routes(item["secondarySourceRoutes"], f"{must_keep_id} secondary")
    if not item["primarySourceRoutes"]:
        raise AuditValidationError(
            f"must-keep item has no primary route: {must_keep_id}"
        )
    if item["lessonIds"] != sorted(set(item["lessonIds"])) or not set(
        item["lessonIds"]
    ) <= set(policy["lessonIds"]):
        raise AuditValidationError(f"must-keep lessonIds are invalid: {must_keep_id}")
    if item["versionStatus"] not in {"current", "future"}:
        raise AuditValidationError(f"invalid versionStatus: {must_keep_id}")
    if item["versionStatus"] == "current" and not item["lessonIds"]:
        raise AuditValidationError(f"current item needs lessonIds: {must_keep_id}")
    if item["versionStatus"] == "future" and (
        item["lessonIds"]
        or not {route["chapter"] for route in item["primarySourceRoutes"]}
        <= set(policy["excludedChapters"])
    ):
        raise AuditValidationError(f"invalid future routing: {must_keep_id}")
    return must_keep_id


def _validate_inventory_structure(inventory, policy):
    if not isinstance(inventory, list):
        raise AuditValidationError("must-keep inventory must be a list")
    ids = [_validate_inventory_item_structure(item, policy) for item in inventory]
    if ids != sorted(set(ids)) or set(ids) != _expected_inventory_ids(policy):
        raise AuditValidationError(
            "must-keep inventory must be the exact sorted 25-ID set"
        )


def _course_inventory_rows(policy, outline_sections):
    rules = policy["mustKeepRules"]
    course_rules = rules["courseObjectives"]
    expected_lessons = course_rules["lessonIds"]
    if (
        course_rules["expectedCount"] != 12
        or len(expected_lessons) != course_rules["expectedCount"]
    ):
        raise AuditValidationError("course objective expectedCount must be 12")
    course = _course_core_content_rows(
        outline_sections, expected_lesson_ids=expected_lessons
    )
    course_rows = []
    routing_by_lesson = course_rules["sourceRoutingByLesson"]
    if set(routing_by_lesson) != set(expected_lessons):
        raise AuditValidationError(
            "sourceRoutingByLesson does not match course lessonIds"
        )
    for row in course:
        lesson_id = row.pop("_lessonId")
        routing = routing_by_lesson[lesson_id]
        if set(routing) != {"primary", "secondary"}:
            raise AuditValidationError(f"course routing fields mismatch: {lesson_id}")
        row.update(
            {
                "primarySourceRoutes": _validated_routes(
                    routing["primary"], f"{lesson_id} primary"
                ),
                "secondarySourceRoutes": _validated_routes(
                    routing["secondary"], f"{lesson_id} secondary"
                ),
                "lessonIds": [lesson_id],
                "versionStatus": "current",
            }
        )
        if not row["primarySourceRoutes"]:
            raise AuditValidationError(
                f"course objective has no primary route: {lesson_id}"
            )
        course_rows.append(row)
    return course_rows


def _validated_analysis_route(row, route, policy):
    if set(route) != {"sourceChapters", "lessonIds", "versionStatus"}:
        raise AuditValidationError(f"{row['mustKeepId']} routing fields mismatch")
    chapters = route["sourceChapters"]
    lesson_ids = route["lessonIds"]
    version_status = route["versionStatus"]
    if (
        not isinstance(chapters, list)
        or chapters != sorted(set(chapters))
        or any(type(chapter) is not int or chapter < 1 for chapter in chapters)
        or not chapters
    ):
        raise AuditValidationError(f"{row['mustKeepId']} sourceChapters are invalid")
    if (
        not isinstance(lesson_ids, list)
        or lesson_ids != sorted(set(lesson_ids))
        or not set(lesson_ids) <= set(policy["lessonIds"])
    ):
        raise AuditValidationError(f"{row['mustKeepId']} lessonIds are invalid")
    if version_status not in {"current", "future"}:
        raise AuditValidationError(f"{row['mustKeepId']} versionStatus is invalid")
    if version_status == "current" and not lesson_ids:
        raise AuditValidationError(
            f"current must-keep item needs a lesson: {row['mustKeepId']}"
        )
    if version_status == "future" and (
        lesson_ids or not set(chapters) <= set(policy["excludedChapters"])
    ):
        raise AuditValidationError(
            f"future item is not routed only to excluded chapters: {row['mustKeepId']}"
        )
    result = dict(row)
    result.update(
        {
            "primarySourceRoutes": [{"chapter": chapter} for chapter in chapters],
            "secondarySourceRoutes": [],
            "lessonIds": list(lesson_ids),
            "versionStatus": version_status,
        }
    )
    return result


def _analysis_inventory_rows(policy, analysis_sections):
    rules = policy["mustKeepRules"]
    analysis_specs = (
        ("highPriority", "analysis-high-priority", _numbered_list_rows),
        ("highRisk", "analysis-high-risk", _markdown_table_rows),
    )
    analysis_rows = []
    for rule_name, id_prefix, parser in analysis_specs:
        rule = rules[rule_name]
        section = _one_section(analysis_sections, rule["headingAnchor"])
        parsed = parser(
            section, expected_count=rule["expectedCount"], id_prefix=id_prefix
        )
        routing = rule["routing"]
        if set(routing) != {row["mustKeepId"] for row in parsed}:
            raise AuditValidationError(
                f"{rule_name} routing does not match parsed rows"
            )
        for row in parsed:
            analysis_rows.append(
                _validated_analysis_route(row, routing[row["mustKeepId"]], policy)
            )
    return analysis_rows


def build_must_keep_inventory(policy, analysis_sections, outline_sections):
    inventory = sorted(
        [
            *_course_inventory_rows(policy, outline_sections),
            *_analysis_inventory_rows(policy, analysis_sections),
        ],
        key=lambda item: item["mustKeepId"],
    )
    if len(inventory) != 25 or len({item["mustKeepId"] for item in inventory}) != 25:
        raise AuditValidationError("must-keep inventory must contain 25 unique items")
    return inventory


def _must_keep_decisions_by_id(decisions, source_map, inventory_by_id):
    if not isinstance(decisions, list):
        raise AuditValidationError("decisions must be a list")
    decisions_by_id = {}
    for decision in decisions:
        if not isinstance(decision, dict):
            raise AuditValidationError("decision must be an object")
        source_id = decision.get("sourceId")
        if source_id in decisions_by_id:
            raise AuditValidationError(f"duplicate decision sourceId: {source_id}")
        if source_id not in source_map:
            raise AuditValidationError(
                f"must-keep claim has unknown sourceId: {source_id}"
            )
        decisions_by_id[source_id] = decision
        unknown = sorted(set(decision.get("mustKeepIds", [])) - set(inventory_by_id))
        if unknown:
            raise AuditValidationError(f"unknown mustKeepId: {unknown[0]}")
    return decisions_by_id


def _validated_must_keep_claim(
    source_id, decision, inventory_item, source_map, source_outline, policy
):
    must_keep_id = inventory_item["mustKeepId"]
    roles = _matched_route_roles(
        source_map[source_id], inventory_item, source_map, source_outline
    )
    if not roles:
        raise AuditValidationError(
            f"must-keep route mismatch: {must_keep_id} <- {source_id}"
        )
    if inventory_item["versionStatus"] == "current":
        if decision.get("disposition") not in {"included", "compressed", "missing"}:
            raise AuditValidationError(
                f"current must-keep disposition mismatch: {source_id}"
            )
        if not set(decision.get("lessonIds", [])) & set(inventory_item["lessonIds"]):
            raise AuditValidationError(
                f"must-keep lesson mismatch: {must_keep_id} <- {source_id}"
            )
    elif (
        decision.get("disposition") != "excluded"
        or decision.get("lessonIds") != []
        or decision.get("reason") != policy["versionBoundaryReason"]
        or "primary" not in roles
    ):
        raise AuditValidationError(
            f"future must-keep mismatch: {must_keep_id} <- {source_id}"
        )
    return {"sourceId": source_id, "roles": roles}


def _collect_valid_must_keep_claims(
    decisions_by_id, inventory_by_id, source_map, source_outline, policy
):
    valid_claims = {must_keep_id: [] for must_keep_id in inventory_by_id}
    for source_id, decision in decisions_by_id.items():
        if decision.get("reviewState") != "reviewed":
            continue
        for must_keep_id in decision.get("mustKeepIds", []):
            valid_claims[must_keep_id].append(
                _validated_must_keep_claim(
                    source_id,
                    decision,
                    inventory_by_id[must_keep_id],
                    source_map,
                    source_outline,
                    policy,
                )
            )
    return valid_claims


def _require_complete_must_keep_claims(inventory_by_id, valid_claims):
    for must_keep_id in inventory_by_id:
        claims = valid_claims[must_keep_id]
        if not claims:
            raise AuditValidationError(f"unclaimed mustKeepId: {must_keep_id}")
        if not any("primary" in claim["roles"] for claim in claims):
            raise AuditValidationError(
                f"primarySourceRoutes not satisfied: {must_keep_id}"
            )


def validate_must_keep_coverage(
    inventory, decisions, source_map, source_outline, policy, require_complete=False
):
    if type(require_complete) is not bool:
        raise TypeError("require_complete must be a bool")
    _validate_inventory_structure(inventory, policy)
    inventory_by_id = {item["mustKeepId"]: item for item in inventory}
    decisions_by_id = _must_keep_decisions_by_id(decisions, source_map, inventory_by_id)
    valid_claims = _collect_valid_must_keep_claims(
        decisions_by_id, inventory_by_id, source_map, source_outline, policy
    )
    if require_complete:
        _require_complete_must_keep_claims(inventory_by_id, valid_claims)
