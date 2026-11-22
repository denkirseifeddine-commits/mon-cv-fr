<?php

namespace Tests\Unit;

use App\Support\SiteJson;
use PHPUnit\Framework\TestCase;

class SiteJsonTest extends TestCase
{
    public function test_standard_style_uses_two_space_indentation_and_final_newline(): void
    {
        $out = SiteJson::encode(['a' => ['b' => 1, 'c' => [1, 2]], 'd' => []]);
        $this->assertSame("{\n  \"a\": {\n    \"b\": 1,\n    \"c\": [\n      1,\n      2\n    ]\n  },\n  \"d\": []\n}\n", $out);
    }

    public function test_compact_style_inlines_scalar_only_objects_and_lists(): void
    {
        $out = SiteJson::encode([['name' => ['fr' => 'é/ب'], 'tags' => ['a', 'b'], 'nested' => ['x' => ['y' => null]]]], SiteJson::COMPACT);
        $this->assertSame(
            "[\n  {\n    \"name\": { \"fr\": \"é/ب\" },\n    \"tags\": [\"a\", \"b\"],\n    \"nested\": {\n      \"x\": { \"y\": null }\n    }\n  }\n]\n",
            $out,
        );
    }

    public function test_unicode_and_slashes_are_not_escaped(): void
    {
        $this->assertSame("\"https://x.y/é\"\n", SiteJson::encode('https://x.y/é'));
    }
}
